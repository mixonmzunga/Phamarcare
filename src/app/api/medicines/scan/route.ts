import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, requirePermission, errorResponse } from '@/lib/auth'
import { uploadToStorage, MEDICINES_BUCKET, isSupabaseConfigured } from '@/lib/supabase'
import ZAI from 'z-ai-web-dev-sdk'
import { promises as fs } from 'fs'
import path from 'path'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const user = await requirePermission('medicine.create')
    const body = await req.json()
    const { barcode } = body

    if (!barcode || barcode.length < 4) {
      return NextResponse.json({ error: 'Invalid barcode' }, { status: 400 })
    }

    // Step 1: Check local database
    const existing = await db.medicine.findUnique({ where: { barcode } })
    if (existing) {
      return NextResponse.json({
        found: true,
        source: 'database',
        medicine: existing,
        message: 'Medicine already exists in your catalog',
      })
    }

    // Step 2: Try OpenFoodFacts / OpenBeautyFacts API (free, no key needed)
    let productData: any = null
    try {
      const offRes = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`, {
        signal: AbortSignal.timeout(8000),
      })
      const offData = await offRes.json()
      if (offData.status === 1 && offData.product) {
        const p = offData.product
        productData = {
          name: p.product_name || p.generic_name || '',
          genericName: p.generic_name || '',
          brand: p.brands || '',
          manufacturer: p.brands || '',
          description: p.ingredients_text || p.allergens || '',
          category: p.categories?.split(',').pop()?.trim() || '',
          image: p.image_front_url || p.image_url || '',
          imageUrl: p.image_front_url || p.image_url || '',
        }
      }
    } catch (e) {
      // OpenFoodFacts lookup failed, continue to AI
    }

    // Step 3: If not found in OpenFoodFacts, use AI (LLM) to identify the medicine
    if (!productData) {
      try {
        const zai = await ZAI.create()
        const response = await zai.chat.completions.create({
          messages: [
            {
              role: 'system',
              content: 'You are a pharmaceutical database expert. Given a barcode/EAN number, identify the medicine or pharmaceutical product. Return ONLY valid JSON with these fields: name, genericName, brand, manufacturer, category (Tablets/Capsules/Syrups/Injections/Liquids/Ointments/Creams/Drops/Medical Equipment/Other), type (Painkillers/Antibiotics/Antimalarials/Diabetes Medicines/Heart Medicines/Vitamins/Antihistamines/Other), description, unit (mg/ml/g/pcs/boxes/strips/bottles/packs), purchasePrice (estimated in MWK), sellingPrice (estimated in MWK with 30-50% markup), prescription (true/false), minStockLevel (number). If you cannot identify the product, return {"unknown": true}.',
            },
            {
              role: 'user',
              content: `Identify this pharmaceutical product from barcode: ${barcode}. Provide realistic details. Prices should be in Malawian Kwacha (MWK).`,
            },
          ],
          thinking: { type: 'disabled' },
        })

        const aiContent = response.choices[0]?.message?.content || ''
        // Extract JSON from response
        const jsonMatch = aiContent.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const aiData = JSON.parse(jsonMatch[0])
          if (!aiData.unknown) {
            productData = {
              name: aiData.name || `Product ${barcode}`,
              genericName: aiData.genericName || '',
              brand: aiData.brand || '',
              manufacturer: aiData.manufacturer || aiData.brand || '',
              description: aiData.description || '',
              category: aiData.category || 'Other',
              type: aiData.type || 'Other',
              unit: aiData.unit || 'pcs',
              purchasePrice: aiData.purchasePrice || 0,
              sellingPrice: aiData.sellingPrice || 0,
              prescription: aiData.prescription || false,
              minStockLevel: aiData.minStockLevel || 10,
              image: '',
              imageUrl: '',
            }
          }
        }
      } catch (aiErr) {
        console.error('AI lookup failed:', aiErr)
      }
    }

    // Step 4: If still not found, return barcode for manual entry
    if (!productData) {
      return NextResponse.json({
        found: false,
        source: 'unknown',
        barcode,
        message: 'Could not identify this product. Please enter details manually.',
      })
    }

    // Step 5: Generate a product image using AI if no image was found
    let imageUrl = productData.imageUrl || ''
    if (!imageUrl) {
      try {
        const zai = await ZAI.create()
        const imgResponse = await zai.images.generations.create({
          prompt: `Professional pharmaceutical product photo of ${productData.name}, clean white background, studio lighting, medical product photography, high quality`,
          size: '1024x1024',
        })
        const imageBase64 = imgResponse.data[0]?.base64
        if (imageBase64) {
          const buffer = Buffer.from(imageBase64, 'base64')
          const filename = `med-${crypto.randomBytes(8).toString('hex')}.png`

          // Upload to Supabase Storage or save locally
          if (isSupabaseConfigured()) {
            try {
              imageUrl = await uploadToStorage(MEDICINES_BUCKET, filename, buffer, 'image/png')
            } catch {
              // Fallback to local
              const uploadDir = path.join(process.cwd(), 'public', 'medicines')
              await fs.mkdir(uploadDir, { recursive: true })
              await fs.writeFile(path.join(uploadDir, filename), buffer)
              imageUrl = `/medicines/${filename}`
            }
          } else {
            const uploadDir = path.join(process.cwd(), 'public', 'medicines')
            await fs.mkdir(uploadDir, { recursive: true })
            await fs.writeFile(path.join(uploadDir, filename), buffer)
            imageUrl = `/medicines/${filename}`
          }
        }
      } catch (imgErr) {
        console.error('Image generation failed:', imgErr)
      }
    }

    // Step 6: Return all captured data
    return NextResponse.json({
      found: true,
      source: productData.imageUrl ? 'openfoodfacts' : 'ai',
      barcode,
      medicine: {
        name: productData.name,
        genericName: productData.genericName || '',
        barcode,
        productCode: `MED-${barcode.slice(-6)}`,
        image: imageUrl,
        manufacturer: productData.manufacturer || productData.brand || '',
        category: productData.category || 'Other',
        type: productData.type || 'Other',
        unit: productData.unit || 'pcs',
        description: productData.description || '',
        purchasePrice: productData.purchasePrice || 0,
        sellingPrice: productData.sellingPrice || 0,
        prescription: productData.prescription || false,
        minStockLevel: productData.minStockLevel || 10,
        boxQuantity: 1,
        stripsPerBox: 0,
        tabletsPerStrip: 0,
        discountPercent: 0,
        vatPercent: 0,
        isActive: true,
      },
      message: `Medicine identified via ${productData.imageUrl ? 'OpenFoodFacts database' : 'AI'}`,
    })
  } catch (e) {
    console.error('Scan error:', e)
    return errorResponse(e)
  }
}
