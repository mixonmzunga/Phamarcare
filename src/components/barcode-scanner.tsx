'use client'

import { useState, useRef, useEffect } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Camera, ScanLine, X, Loader2, PackageSearch, CheckCircle2, AlertCircle } from 'lucide-react'

interface BarcodeScannerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onScanComplete: (barcode: string, medicineData: any) => void
}

export function BarcodeScanner({ open, onOpenChange, onScanComplete }: BarcodeScannerProps) {
  const [scanning, setScanning] = useState(false)
  const [manualBarcode, setManualBarcode] = useState('')
  const [looking, setLooking] = useState(false)
  const [scanResult, setScanResult] = useState<any>(null)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const containerId = 'barcode-scanner-region'

  useEffect(() => {
    if (open && !scanning && !scanResult) {
      startScanner()
    }
    return () => {
      stopScanner()
    }
  }, [open])

  async function startScanner() {
    try {
      setScanning(true)
      const html5Qrcode = new Html5Qrcode(containerId, { verbose: false })
      scannerRef.current = html5Qrcode

      await html5Qrcode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        (decodedText) => {
          // Barcode detected!
          html5Qrcode.stop().catch(() => {})
          setScanning(false)
          lookupBarcode(decodedText)
        },
        () => {}
      )
    } catch (err: any) {
      console.error('Camera error:', err)
      toast.error('Could not access camera. Enter barcode manually below.')
      setScanning(false)
    }
  }

  async function stopScanner() {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop()
        await scannerRef.current.clear()
      } catch {}
      scannerRef.current = null
    }
    setScanning(false)
  }

  async function lookupBarcode(barcode: string) {
    setLooking(true)
    try {
      const res = await fetch('/api/medicines/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barcode }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      if (data.found && data.medicine) {
        setScanResult({ barcode, ...data })
        toast.success(data.message)
      } else if (data.found && data.source === 'database') {
        // Already in catalog
        setScanResult({ barcode, ...data })
        toast.info('Medicine already exists in your catalog')
      } else {
        // Not found - allow manual entry
        setScanResult({ barcode, found: false, source: 'unknown', message: data.message })
        toast.warning('Product not identified. Enter details manually.')
      }
    } catch (e: any) {
      toast.error(e.message || 'Lookup failed')
      setScanResult({ barcode, found: false, source: 'error', message: 'Lookup failed' })
    } finally {
      setLooking(false)
    }
  }

  function handleManualSubmit() {
    if (manualBarcode.length < 4) {
      toast.error('Enter a valid barcode')
      return
    }
    stopScanner()
    lookupBarcode(manualBarcode)
    setManualBarcode('')
  }

  function handleConfirm() {
    if (scanResult?.medicine) {
      onScanComplete(scanResult.barcode, scanResult.medicine)
    } else if (scanResult?.barcode) {
      // Even if not found, pass the barcode to pre-fill
      onScanComplete(scanResult.barcode, { barcode: scanResult.barcode, name: '' })
    }
    handleClose()
  }

  function handleClose() {
    stopScanner()
    setScanResult(null)
    setManualBarcode('')
    onOpenChange(false)
  }

  function handleRetry() {
    setScanResult(null)
    startScanner()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto scroll-thin">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="w-5 h-5 text-primary" />
            Scan Medicine Barcode
          </DialogTitle>
        </DialogHeader>

        {/* Scanner / Results */}
        {!scanResult ? (
          <div className="space-y-4">
            {/* Camera view */}
            <div className="relative">
              <div
                id={containerId}
                className="w-full bg-slate-900 rounded-xl overflow-hidden aspect-[4/3] flex items-center justify-center"
              >
                {!scanning && !looking && (
                  <div className="text-center text-slate-400">
                    <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Starting camera...</p>
                  </div>
                )}
                {looking && (
                  <div className="text-center text-white">
                    <Loader2 className="w-10 h-10 mx-auto mb-2 animate-spin" />
                    <p className="text-sm">Looking up product...</p>
                  </div>
                )}
              </div>
              {/* Scan overlay */}
              {scanning && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-[80%] h-24 border-2 border-primary rounded-lg relative">
                    <div className="absolute inset-x-0 top-0 h-0.5 bg-primary animate-pulse" style={{ animation: 'scanline 2s ease-in-out infinite' }} />
                  </div>
                </div>
              )}
            </div>

            {scanning && (
              <p className="text-center text-sm text-slate-500">
                Point your camera at the medicine barcode
              </p>
            )}

            {/* Manual entry */}
            <div className="pt-3 border-t border-slate-100">
              <p className="text-xs text-slate-400 mb-2 text-center">Or enter barcode manually:</p>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. 6001234500011"
                  value={manualBarcode}
                  onChange={(e) => setManualBarcode(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
                  className="h-10"
                />
                <Button onClick={handleManualSubmit} className="shrink-0" disabled={looking}>
                  <PackageSearch className="w-4 h-4 mr-1" /> Lookup
                </Button>
              </div>
            </div>

            <Button variant="outline" onClick={handleClose} className="w-full">
              <X className="w-4 h-4 mr-2" /> Cancel
            </Button>
          </div>
        ) : (
          /* Scan result */
          <div className="space-y-4">
            {scanResult.found && scanResult.medicine ? (
              <div className="space-y-3">
                {/* Success header */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 shrink-0" />
                  <div>
                    <p className="font-semibold text-emerald-800 text-sm">Medicine Identified!</p>
                    <p className="text-xs text-emerald-600">via {scanResult.source === 'database' ? 'Your Catalog' : scanResult.source === 'openfoodfacts' ? 'Product Database' : 'AI Recognition'}</p>
                  </div>
                </div>

                {/* Medicine image */}
                {scanResult.medicine.image && (
                  <div className="flex justify-center">
                    <img
                      src={scanResult.medicine.image}
                      alt={scanResult.medicine.name}
                      className="w-32 h-32 rounded-xl object-cover border border-slate-200 shadow-sm"
                    />
                  </div>
                )}

                {/* Medicine details */}
                <div className="space-y-2 p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Name:</span>
                    <span className="font-medium text-slate-800">{scanResult.medicine.name}</span>
                  </div>
                  {scanResult.medicine.genericName && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Generic:</span>
                      <span className="text-slate-600">{scanResult.medicine.genericName}</span>
                    </div>
                  )}
                  {scanResult.medicine.manufacturer && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Manufacturer:</span>
                      <span className="text-slate-600">{scanResult.medicine.manufacturer}</span>
                    </div>
                  )}
                  {scanResult.medicine.category && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Category:</span>
                      <span className="text-slate-600">{scanResult.medicine.category}</span>
                    </div>
                  )}
                  {scanResult.medicine.sellingPrice > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Selling Price:</span>
                      <span className="font-bold text-primary">MWK {scanResult.medicine.sellingPrice.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Barcode:</span>
                    <span className="font-mono text-xs text-slate-600">{scanResult.barcode}</span>
                  </div>
                  {scanResult.medicine.prescription && (
                    <div className="flex justify-end">
                      <span className="px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 text-[10px] font-bold">Prescription Required</span>
                    </div>
                  )}
                </div>

                {scanResult.source === 'database' ? (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-700">
                    This medicine already exists in your catalog. You can still review and update it.
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 text-center">
                    Review the details and tap "Add to Catalog" to save this medicine.
                  </p>
                )}

                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleRetry} className="flex-1">
                    Scan Again
                  </Button>
                  <Button
                    onClick={handleConfirm}
                    className="flex-1"
                    style={{ background: 'linear-gradient(135deg, #2F6BFF 0%, #1e4fd6 100%)' }}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    {scanResult.source === 'database' ? 'View Details' : 'Add to Catalog'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
                  <AlertCircle className="w-8 h-8 text-amber-500 shrink-0" />
                  <div>
                    <p className="font-semibold text-amber-800 text-sm">Not Identified</p>
                    <p className="text-xs text-amber-600">{scanResult.message}</p>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-sm">
                  <span className="text-slate-400">Barcode:</span>{' '}
                  <span className="font-mono text-slate-600">{scanResult.barcode}</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleRetry} className="flex-1">
                    Try Again
                  </Button>
                  <Button
                    onClick={handleConfirm}
                    className="flex-1"
                    style={{ background: 'linear-gradient(135deg, #2F6BFF 0%, #1e4fd6 100%)' }}
                  >
                    Enter Manually
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
