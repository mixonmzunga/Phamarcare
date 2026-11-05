import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission, errorResponse } from '@/lib/auth'

// Stock adjustment: ADD, REMOVE, DAMAGE, EXPIRE
export async function POST(req: NextRequest) {
  try {
    const user = await requirePermission('inventory.edit')
    const body = await req.json()
    const { medicineId, batchId, type, quantity, reason } = body
    if (!['ADD', 'REMOVE', 'DAMAGE', 'EXPIRE'].includes(type)) {
      return NextResponse.json({ error: 'Invalid adjustment type' }, { status: 400 })
    }
    const result = await db.$transaction(async (tx) => {
      const batch = await tx.batch.findUnique({ where: { id: batchId } })
      if (!batch) throw new Error('Batch not found')
      let newQty = batch.availableQty
      let newDamaged = batch.damagedQty
      let moveType = 'ADJUSTMENT'
      let moveQty = quantity
      if (type === 'ADD') { newQty += quantity; moveQty = quantity }
      else if (type === 'REMOVE') { newQty -= quantity; moveQty = -quantity; if (newQty < 0) throw new Error('Insufficient stock') }
      else if (type === 'DAMAGE') { newQty -= quantity; newDamaged += quantity; moveType = 'DAMAGE'; moveQty = -quantity; if (newQty < 0) throw new Error('Insufficient stock') }
      else if (type === 'EXPIRE') { newQty -= quantity; newDamaged += quantity; moveType = 'EXPIRE'; moveQty = -quantity; if (newQty < 0) throw new Error('Insufficient stock') }
      const updated = await tx.batch.update({ where: { id: batchId }, data: { availableQty: newQty, damagedQty: newDamaged, status: newQty === 0 ? (type === 'EXPIRE' ? 'EXPIRED' : type === 'DAMAGE' ? 'DAMAGED' : 'CLOSED') : 'ACTIVE' } })
      await tx.stockMovement.create({ data: { medicineId, batchId, type: moveType, quantity: moveQty, note: reason, createdById: user.id } })
      await tx.stockAdjustment.create({ data: { medicineId, batchId, type, quantity, reason, createdById: user.id } })
      return updated
    })
    return NextResponse.json({ item: result })
  } catch (e) { return errorResponse(e) }
}
