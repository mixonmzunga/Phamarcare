'use client'

import { useState, useRef, useEffect } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Camera, ScanLine, X, Loader2, PackageSearch, CheckCircle2, AlertCircle, Keyboard, ShieldAlert, RefreshCw } from 'lucide-react'

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
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [cameraAvailable, setCameraAvailable] = useState(true)
  const [mode, setMode] = useState<'manual' | 'camera'>('manual')
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const containerId = 'barcode-scanner-region'

  // Check if camera is available (requires HTTPS or localhost)
  useEffect(() => {
    if (open) {
      const isSecure = typeof window !== 'undefined' && (window.isSecureContext || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      const hasMediaDevices = typeof navigator !== 'undefined' && !!navigator.mediaDevices && !!navigator.mediaDevices.getUserMedia

      if (!isSecure || !hasMediaDevices) {
        setCameraAvailable(false)
        setMode('manual')
      } else {
        setCameraAvailable(true)
        setMode('camera')
      }
    }
  }, [open])

  useEffect(() => {
    if (open && mode === 'camera' && cameraAvailable && !scanning && !scanResult && !looking) {
      startScanner()
    }
    return () => {
      stopScanner()
    }
  }, [open, mode, cameraAvailable])

  async function startScanner() {
    if (!cameraAvailable) return
    try {
      setCameraError(null)
      setScanning(true)
      const html5Qrcode = new Html5Qrcode(containerId, { verbose: false })
      scannerRef.current = html5Qrcode

      await html5Qrcode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        (decodedText) => {
          html5Qrcode.stop().catch(() => {})
          setScanning(false)
          lookupBarcode(decodedText)
        },
        () => {}
      )
    } catch (err: any) {
      console.error('Camera error:', err)
      setScanning(false)
      if (err?.name === 'NotAllowedError') {
        setCameraError('Camera permission denied. Please allow camera access in your browser settings, or use manual entry below.')
      } else if (err?.name === 'NotFoundError') {
        setCameraError('No camera found on this device. Use manual entry below.')
      } else {
        setCameraError('Camera unavailable. Use manual entry below to look up the barcode.')
      }
      setMode('manual')
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
        setScanResult({ barcode, ...data })
        toast.info('Medicine already exists in your catalog')
      } else {
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
      onScanComplete(scanResult.barcode, { barcode: scanResult.barcode, name: '' })
    }
    handleClose()
  }

  function handleClose() {
    stopScanner()
    setScanResult(null)
    setManualBarcode('')
    setCameraError(null)
    onOpenChange(false)
  }

  function handleRetry() {
    setScanResult(null)
    if (cameraAvailable && mode === 'camera') {
      startScanner()
    }
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
            {/* Mode tabs - only show if camera is available */}
            {cameraAvailable && (
              <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                <button
                  onClick={() => { stopScanner(); setMode('camera'); setCameraError(null) }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${mode === 'camera' ? 'bg-white text-primary shadow-sm' : 'text-slate-500'}`}
                >
                  <Camera className="w-4 h-4" /> Camera
                </button>
                <button
                  onClick={() => { stopScanner(); setMode('manual') }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${mode === 'manual' ? 'bg-white text-primary shadow-sm' : 'text-slate-500'}`}
                >
                  <Keyboard className="w-4 h-4" /> Manual
                </button>
              </div>
            )}

            {/* Camera mode */}
            {mode === 'camera' && cameraAvailable ? (
              <>
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
                  {scanning && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="w-[80%] h-24 border-2 border-primary rounded-lg relative">
                        <div className="absolute inset-x-0 top-0 h-0.5 bg-primary animate-pulse" style={{ animation: 'scanline 2s ease-in-out infinite' }} />
                      </div>
                    </div>
                  )}
                </div>
                {scanning && (
                  <p className="text-center text-sm text-slate-500">Point your camera at the medicine barcode</p>
                )}
                {cameraError && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-amber-700">{cameraError}</p>
                      <button onClick={() => { setCameraError(null); startScanner() }} className="text-xs text-primary font-medium mt-1 flex items-center gap-1">
                        <RefreshCw className="w-3 h-3" /> Retry camera
                      </button>
                    </div>
                  </div>
                )}
                {/* Quick manual entry even in camera mode */}
                <div className="pt-3 border-t border-slate-100">
                  <p className="text-xs text-slate-400 mb-2 text-center">Or type the barcode:</p>
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
              </>
            ) : (
              /* Manual mode (or camera unavailable) */
              <div className="space-y-4">
                {/* Camera unavailable warning */}
                {!cameraAvailable && (
                  <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 flex items-start gap-2">
                    <ShieldAlert className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-700">Camera not available</p>
                      <p className="text-xs text-blue-500 mt-0.5">
                        Camera access requires HTTPS. On a phone with the installed app or a secure connection,
                        the camera scanner will be available. For now, enter the barcode number manually below.
                      </p>
                    </div>
                  </div>
                )}

                {/* Manual entry - prominent */}
                <div className="text-center py-2">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
                    <PackageSearch className="w-8 h-8 text-primary" />
                  </div>
                  <p className="text-sm font-medium text-slate-700 mb-1">Enter Medicine Barcode</p>
                  <p className="text-xs text-slate-400">Type the barcode number from the medicine packaging</p>
                </div>

                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. 6001234500011"
                    value={manualBarcode}
                    onChange={(e) => setManualBarcode(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
                    className="h-12 text-base text-center font-mono tracking-wider"
                    autoFocus
                  />
                  <Button
                    onClick={handleManualSubmit}
                    className="shrink-0 h-12 px-5"
                    disabled={looking || manualBarcode.length < 4}
                    style={{ background: 'linear-gradient(135deg, #2F6BFF 0%, #1e4fd6 100%)' }}
                  >
                    {looking ? <Loader2 className="w-5 h-5 animate-spin" /> : <><PackageSearch className="w-5 h-5 mr-1" /> Lookup</>}
                  </Button>
                </div>

                {looking && (
                  <div className="text-center py-2">
                    <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary mb-2" />
                    <p className="text-sm text-slate-500">Looking up product via AI...</p>
                    <p className="text-xs text-slate-400 mt-1">This may take a few seconds</p>
                  </div>
                )}

                {/* Quick barcode examples */}
                <div className="pt-3 border-t border-slate-100">
                  <p className="text-xs text-slate-400 mb-2">Quick test barcodes:</p>
                  <div className="flex flex-wrap gap-2">
                    {['6001234500011', '5901234123457', '8901234500099'].map((bc) => (
                      <button
                        key={bc}
                        onClick={() => { setManualBarcode(bc); }}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-mono text-slate-500 transition-colors"
                      >
                        {bc}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <Button variant="outline" onClick={handleClose} className="w-full">
              <X className="w-4 h-4 mr-2" /> Cancel
            </Button>
          </div>
        ) : (
          /* Scan result */
          <div className="space-y-4">
            {scanResult.found && scanResult.medicine ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 shrink-0" />
                  <div>
                    <p className="font-semibold text-emerald-800 text-sm">Medicine Identified!</p>
                    <p className="text-xs text-emerald-600">via {scanResult.source === 'database' ? 'Your Catalog' : scanResult.source === 'openfoodfacts' ? 'Product Database' : 'AI Recognition'}</p>
                  </div>
                </div>

                {scanResult.medicine.image && (
                  <div className="flex justify-center">
                    <img src={scanResult.medicine.image} alt={scanResult.medicine.name} className="w-32 h-32 rounded-xl object-cover border border-slate-200 shadow-sm" />
                  </div>
                )}

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
                  <p className="text-xs text-slate-400 text-center">Review the details and tap "Add to Catalog" to save this medicine.</p>
                )}

                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleRetry} className="flex-1">Scan Again</Button>
                  <Button onClick={handleConfirm} className="flex-1" style={{ background: 'linear-gradient(135deg, #2F6BFF 0%, #1e4fd6 100%)' }}>
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
                  <Button variant="outline" onClick={handleRetry} className="flex-1">Try Again</Button>
                  <Button onClick={handleConfirm} className="flex-1" style={{ background: 'linear-gradient(135deg, #2F6BFF 0%, #1e4fd6 100%)' }}>Enter Manually</Button>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
