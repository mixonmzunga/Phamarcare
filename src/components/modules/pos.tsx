'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { toast } from 'sonner'
import { useNav } from '@/lib/store'
import { formatMoney } from '@/lib/format'
import { Search, Plus, Minus, Trash2, ShoppingCart, Pause, Play, Printer, X, ScanLine, Check, ChevronLeft } from 'lucide-react'

interface CartItem { medicineId: string; name: string; price: number; qty: number; stock: number; discountPercent: number; vatPercent: number; prescription: boolean }

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'AIRTEL_MONEY', label: 'Airtel Money' },
  { value: 'TNM_MPAMBA', label: 'TNM Mpamba' },
  { value: 'BANK', label: 'Bank Transfer' },
  { value: 'CARD', label: 'Card' },
  { value: 'CREDIT', label: 'Credit' },
]

interface HeldBill { id: string; items: CartItem[]; customerName: string; customerId: string; at: string }

export function PosModule() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [customerId, setCustomerId] = useState('walkin')
  const [customerName, setCustomerName] = useState('Walk-in Customer')
  const [discountPercent, setDiscountPercent] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState('CASH')
  const [paidAmount, setPaidAmount] = useState(0)
  const [note, setNote] = useState('')
  const [heldBills, setHeldBills] = useState<HeldBill[]>(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('pharmacare_held_bills') : null
      return raw ? JSON.parse(raw) : []
    } catch { return [] }
  })
  const [showHeld, setShowHeld] = useState(false)
  const [cartSheetOpen, setCartSheetOpen] = useState(false)
  const [receipt, setReceipt] = useState<any>(null)
  const [lastSale, setLastSale] = useState<any>(null)

  const { data: medData } = useQuery({
    queryKey: ['pos-medicines', search],
    queryFn: async () => {
      const p = new URLSearchParams()
      if (search) p.set('q', search)
      const res = await fetch(`/api/medicines?${p}`)
      return res.json()
    },
  })
  const { data: custData } = useQuery({ queryKey: ['pos-customers'], queryFn: async () => (await fetch('/api/customers')).json() })
  const { data: settings } = useQuery({ queryKey: ['pos-settings'], queryFn: async () => (await fetch('/api/settings')).json() })

  const defaultVat = Number(settings?.vatPercent || 0)
  const medicines = (medData?.items || []).filter((m: any) => (m.totalStock ?? 0) > 0)

  function addToCart(m: any) {
    setCart((prev) => {
      const ex = prev.find((x) => x.medicineId === m.id)
      if (ex) {
        if (ex.qty + 1 > m.totalStock) { toast.error('Cannot exceed available stock'); return prev }
        return prev.map((x) => x.medicineId === m.id ? { ...x, qty: x.qty + 1 } : x)
      }
      return [...prev, { medicineId: m.id, name: m.name, price: m.sellingPrice, qty: 1, stock: m.totalStock, discountPercent: m.discountPercent || 0, vatPercent: m.vatPercent || defaultVat, prescription: m.prescription }]
    })
  }
  function updateQty(id: string, delta: number) {
    setCart((prev) => prev.map((x) => {
      if (x.medicineId !== id) return x
      const q = x.qty + delta
      if (q <= 0) return x
      if (q > x.stock) { toast.error('Cannot exceed available stock'); return x }
      return { ...x, qty: q }
    }))
  }
  function setQty(id: string, val: number) { setCart((prev) => prev.map((x) => x.medicineId === id ? { ...x, qty: Math.min(Math.max(1, val), x.stock) } : x)) }
  function setPrice(id: string, val: number) { setCart((prev) => prev.map((x) => x.medicineId === id ? { ...x, price: Math.max(0, val) } : x)) }
  function removeItem(id: string) { setCart((prev) => prev.filter((x) => x.medicineId !== id)) }
  function clearCart() { setCart([]); setDiscountPercent(0); setPaidAmount(0); setNote('') }

  const subTotal = cart.reduce((s, x) => s + x.price * x.qty, 0)
  const itemDiscount = cart.reduce((s, x) => s + x.price * x.qty * (x.discountPercent / 100), 0)
  const afterDiscount = subTotal - itemDiscount
  const saleDiscount = afterDiscount * (discountPercent / 100)
  const taxable = afterDiscount - saleDiscount
  const vatAmount = cart.reduce((s, x) => {
    const lineNet = x.price * x.qty * (1 - x.discountPercent / 100) * (1 - discountPercent / 100)
    return s + lineNet * (x.vatPercent / 100)
  }, 0)
  const totalAmount = taxable + vatAmount
  const changeAmount = Math.max(0, paidAmount - totalAmount)

  function holdBill() {
    if (cart.length === 0) { toast.error('Cart is empty'); return }
    const bill: HeldBill = { id: Date.now().toString(), items: cart, customerName, customerId, at: new Date().toISOString() }
    const updated = [bill, ...heldBills]
    setHeldBills(updated)
    localStorage.setItem('pharmacare_held_bills', JSON.stringify(updated))
    clearCart()
    setCustomerId('walkin'); setCustomerName('Walk-in Customer')
    toast.success('Bill held')
  }
  function recallBill(bill: HeldBill) {
    setCart(bill.items); setCustomerId(bill.customerId); setCustomerName(bill.customerName)
    const updated = heldBills.filter((b) => b.id !== bill.id)
    setHeldBills(updated)
    localStorage.setItem('pharmacare_held_bills', JSON.stringify(updated))
    setShowHeld(false)
  }
  function deleteHeld(id: string) {
    const updated = heldBills.filter((b) => b.id !== id)
    setHeldBills(updated)
    localStorage.setItem('pharmacare_held_bills', JSON.stringify(updated))
  }

  const checkoutMut = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/pos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map((x) => ({ medicineId: x.medicineId, name: x.name, quantity: x.qty, unitPrice: x.price, discountPercent: x.discountPercent, vatPercent: x.vatPercent })),
          customerId: customerId === 'walkin' ? null : customerId, customerName,
          subTotal, discountPercent, discountAmount: saleDiscount, vatPercent: defaultVat, vatAmount, totalAmount,
          paidAmount: paymentMethod === 'CREDIT' ? 0 : (paidAmount || totalAmount), paymentMethod, note,
        }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      return d
    },
    onSuccess: (d) => {
      toast.success('Sale completed')
      setLastSale(d.sale); setReceipt(d.sale); clearCart(); setPaidAmount(0); setCartSheetOpen(false)
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['pos-medicines'] })
    },
    onError: (e: any) => toast.error(e.message),
  })

  function selectCustomer(id: string) {
    setCustomerId(id)
    if (id === 'walkin') setCustomerName('Walk-in Customer')
    else {
      const c = custData?.items?.find((x: any) => x.id === id)
      setCustomerName(c?.name || 'Walk-in Customer')
    }
  }

  // Cart summary card (shared between desktop sidebar and mobile sheet)
  const cartPanel = (
    <div className="flex flex-col h-full gap-3">
      {/* Cart header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <ShoppingCart className="w-5 h-5 text-primary shrink-0" />
          <span className="font-semibold text-slate-800 truncate">Current Sale</span>
          <Badge variant="secondary" className="shrink-0">{cart.length}</Badge>
        </div>
        <div className="flex gap-1 shrink-0">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowHeld(true)} title="Held bills"><Pause className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={holdBill} title="Hold bill"><Pause className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={clearCart} title="Clear cart"><Trash2 className="w-4 h-4 text-destructive" /></Button>
        </div>
      </div>

      {/* Customer selector */}
      <Select value={customerId} onValueChange={selectCustomer}>
        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="walkin">Walk-in Customer</SelectItem>
          {custData?.items?.filter((c: any) => c.phone !== '0000').map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
        </SelectContent>
      </Select>

      {/* Cart items */}
      <div className="flex-1 overflow-y-auto scroll-thin -mx-1 px-1">
        {cart.length === 0 ? <div className="text-center py-10 text-slate-400 text-sm">Cart is empty. Tap medicines to add.</div> : (
          <div className="space-y-1.5">
            {cart.map((item) => (
              <div key={item.medicineId} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-sm font-medium text-slate-800 flex-1 min-w-0 leading-tight">{item.name}</p>
                  <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive shrink-0" onClick={() => removeItem(item.medicineId)}><X className="w-3.5 h-3.5" /></Button>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQty(item.medicineId, -1)}><Minus className="w-3 h-3" /></Button>
                    <Input type="number" value={item.qty} onChange={(e) => setQty(item.medicineId, Number(e.target.value))} className="h-7 w-12 text-center text-xs" />
                    <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQty(item.medicineId, 1)}><Plus className="w-3 h-3" /></Button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Input type="number" value={item.price} onChange={(e) => setPrice(item.medicineId, Number(e.target.value))} className="h-7 w-20 text-xs text-right" />
                    <span className="text-sm font-semibold text-slate-800 whitespace-nowrap">{formatMoney(item.price * item.qty)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Totals + checkout */}
      <div className="border-t border-slate-100 pt-3 space-y-2">
        <div className="space-y-1 text-sm">
          <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>{formatMoney(subTotal)}</span></div>
          {itemDiscount > 0 && <div className="flex justify-between text-slate-600"><span>Item Discounts</span><span>-{formatMoney(itemDiscount)}</span></div>}
          <div className="flex justify-between items-center text-slate-600"><span>Sale Discount %</span><Input type="number" value={discountPercent} onChange={(e) => setDiscountPercent(Math.max(0, Number(e.target.value)))} className="h-7 w-20 text-right text-xs" /></div>
          {saleDiscount > 0 && <div className="flex justify-between text-slate-600"><span>Sale Discount</span><span>-{formatMoney(saleDiscount)}</span></div>}
          {vatAmount > 0 && <div className="flex justify-between text-slate-600"><span>VAT</span><span>{formatMoney(vatAmount)}</span></div>}
          <div className="flex justify-between text-base font-bold text-slate-800 border-t border-slate-200 pt-1.5"><span>Total</span><span className="text-primary">{formatMoney(totalAmount)}</span></div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Select value={paymentMethod} onValueChange={setPaymentMethod}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>{PAYMENT_METHODS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
          </Select>
          {paymentMethod !== 'CREDIT' ? (
            <Input type="number" placeholder={`Change: ${formatMoney(changeAmount)}`} value={paidAmount || ''} onChange={(e) => setPaidAmount(Number(e.target.value))} className="h-9 text-sm" />
          ) : <div className="flex items-center justify-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-md">Credit Sale</div>}
        </div>
        <Button className="w-full h-11 text-base" style={{ background: 'linear-gradient(135deg, #2F6BFF 0%, #1e4fd6 100%)' }} disabled={cart.length === 0 || checkoutMut.isPending} onClick={() => checkoutMut.mutate()}>
          {checkoutMut.isPending ? 'Processing...' : <><Check className="w-5 h-5 mr-2" /> Complete Sale · {formatMoney(totalAmount)}</>}
        </Button>
        {lastSale && <Button variant="outline" className="w-full h-9" onClick={() => setReceipt(lastSale)}><Printer className="w-4 h-4 mr-2" /> Print Last Receipt</Button>}
      </div>
    </div>
  )

  return (
    <div className="lg:h-[calc(100vh-7.5rem)] flex flex-col lg:flex-row gap-3 lg:gap-4">
      {/* Left: medicines (always visible) */}
      <div className="flex-1 flex flex-col min-h-0">
        <Card className="border-slate-200 shadow-sm p-2.5 sm:p-3 mb-3">
          <div className="relative">
            <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-primary" />
            <Input autoFocus placeholder="Scan barcode or search medicine..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 h-11 text-base" onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const m = medicines.find((x: any) => x.barcode === search || x.productCode === search)
                if (m) { addToCart(m); setSearch(''); (e.target as HTMLInputElement).focus() }
                else if (medicines.length === 1) { addToCart(medicines[0]); setSearch('') }
              }
            }} />
          </div>
        </Card>
        <Card className="border-slate-200 shadow-sm flex-1 overflow-hidden lg:max-h-full max-h-[calc(100vh-13rem)] lg:max-h-none">
          <ScrollArea className="h-full scroll-thin">
            <div className="p-2 sm:p-3 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2">
              {medicines.length === 0 && <div className="col-span-full text-center py-10 text-slate-400 text-sm">No medicines in stock</div>}
              {medicines.map((m: any) => (
                <button key={m.id} onClick={() => addToCart(m)} className="text-left p-2.5 sm:p-3 rounded-lg border border-slate-200 hover:border-primary hover:bg-primary/5 active:bg-primary/10 transition-colors group">
                  <div className="flex items-start justify-between gap-1">
                    <span className="text-xs sm:text-sm font-medium text-slate-800 line-clamp-2 leading-tight">{m.name}</span>
                    {m.prescription && <Badge variant="secondary" className="text-[9px] h-4 shrink-0">Rx</Badge>}
                  </div>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-xs sm:text-sm font-bold text-primary">{formatMoney(m.sellingPrice)}</span>
                    <Badge variant={(m.totalStock ?? 0) <= m.minStockLevel ? 'destructive' : 'secondary'} className="text-[10px]">{m.totalStock ?? 0}</Badge>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </Card>
      </div>

      {/* Desktop cart sidebar (lg+) */}
      <div className="hidden lg:flex w-[400px] xl:w-[420px] flex-col">
        <Card className="border-slate-200 shadow-sm p-4 flex-1 flex flex-col">
          {cartPanel}
        </Card>
      </div>

      {/* Mobile floating cart button */}
      {cart.length > 0 && (
        <button
          onClick={() => setCartSheetOpen(true)}
          className="lg:hidden fixed bottom-4 left-3 right-3 z-30 flex items-center justify-between px-4 py-3 rounded-2xl text-white shadow-xl active:scale-[0.98] transition-transform"
          style={{ background: 'linear-gradient(135deg, #2F6BFF 0%, #1e4fd6 100%)' }}
        >
          <span className="flex items-center gap-2">
            <span className="relative">
              <ShoppingCart className="w-5 h-5" />
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-white text-primary text-[10px] font-bold flex items-center justify-center">{cart.length}</span>
            </span>
            <span className="font-semibold text-sm">View Cart</span>
          </span>
          <span className="font-bold">{formatMoney(totalAmount)}</span>
        </button>
      )}

      {/* Mobile cart bottom sheet */}
      <Sheet open={cartSheetOpen} onOpenChange={setCartSheetOpen}>
        <SheetContent side="bottom" className="h-[90vh] p-0 rounded-t-2xl flex flex-col">
          <SheetHeader className="px-4 pt-3 pb-2 border-b border-slate-100 shrink-0">
            <SheetTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2"><ShoppingCart className="w-5 h-5 text-primary" /> Cart ({cart.length})</span>
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-hidden p-4">
            {cartPanel}
          </div>
        </SheetContent>
      </Sheet>

      {/* Held bills dialog */}
      <Dialog open={showHeld} onOpenChange={setShowHeld}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto scroll-thin">
          <DialogHeader><DialogTitle>Held Bills</DialogTitle></DialogHeader>
          {heldBills.length === 0 ? <p className="text-sm text-slate-500 text-center py-6">No held bills</p> : (
            <div className="space-y-2 max-h-80 overflow-y-auto scroll-thin">
              {heldBills.map((b) => (
                <div key={b.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{b.customerName}</p>
                    <p className="text-xs text-slate-400">{b.items.length} items · {new Date(b.at).toLocaleString('en-GB')}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => recallBill(b)}><Play className="w-4 h-4" /></Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteHeld(b.id)}><X className="w-4 h-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {receipt && <ReceiptDialog sale={receipt} onClose={() => setReceipt(null)} />}
    </div>
  )
}

function ReceiptDialog({ sale, onClose }: { sale: any; onClose: () => void }) {
  const [details, setDetails] = useState<any>(null)
  useEffect(() => {
    fetch(`/api/sales/${sale.id}`).then((r) => r.json()).then((d) => setDetails(d.item || d.sale))
  }, [sale.id])
  const items = details?.items || sale.items || []
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto scroll-thin">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Check className="w-5 h-5 text-emerald-500" /> Sale Completed</DialogTitle></DialogHeader>
        <div className="print-area" id="receipt-print">
          <div className="text-center mb-3">
            <h2 className="font-bold text-lg">PharmaCare Pharmacy</h2>
            <p className="text-xs text-slate-500">Plot 123, Glyn Jones Road, Lilongwe</p>
            <p className="text-xs text-slate-500">+265 1 700 123</p>
          </div>
          <div className="text-xs border-t border-b border-dashed border-slate-300 py-2 mb-2">
            <div className="flex justify-between"><span>Invoice:</span><span className="font-medium">{sale.invoiceNumber}</span></div>
            <div className="flex justify-between"><span>Date:</span><span>{new Date(sale.createdAt).toLocaleString('en-GB')}</span></div>
            <div className="flex justify-between"><span>Customer:</span><span>{sale.customerName}</span></div>
            <div className="flex justify-between"><span>Cashier:</span><span>{sale.cashier?.name || ''}</span></div>
          </div>
          <table className="w-full text-xs mb-2">
            <tbody>
              {items.map((it: any) => (
                <tr key={it.id} className="border-b border-dashed border-slate-200">
                  <td className="py-1">{it.name}<br /><span className="text-slate-400">{it.quantity} × {formatMoney(it.unitPrice)}</span></td>
                  <td className="py-1 text-right align-top font-medium">{formatMoney(it.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-dashed border-slate-300 pt-2 text-xs space-y-0.5">
            <div className="flex justify-between"><span>Subtotal:</span><span>{formatMoney(sale.subTotal)}</span></div>
            {sale.discountAmount > 0 && <div className="flex justify-between"><span>Discount:</span><span>-{formatMoney(sale.discountAmount)}</span></div>}
            {sale.vatAmount > 0 && <div className="flex justify-between"><span>VAT:</span><span>{formatMoney(sale.vatAmount)}</span></div>}
            <div className="flex justify-between font-bold text-sm border-t border-slate-300 pt-1"><span>TOTAL:</span><span>{formatMoney(sale.totalAmount)}</span></div>
            <div className="flex justify-between"><span>Paid ({sale.paymentMethod}):</span><span>{formatMoney(sale.paidAmount)}</span></div>
            {sale.changeAmount > 0 && <div className="flex justify-between"><span>Change:</span><span>{formatMoney(sale.changeAmount)}</span></div>}
            {sale.dueAmount > 0 && <div className="flex justify-between text-red-600"><span>Due:</span><span>{formatMoney(sale.dueAmount)}</span></div>}
          </div>
          <p className="text-center text-xs mt-3 text-slate-500">Thank you for shopping with PharmaCare. Get well soon!</p>
        </div>
        <DialogFooter className="no-print flex-row gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">Close</Button>
          <Button onClick={() => window.print()} className="flex-1" style={{ background: 'linear-gradient(135deg, #2F6BFF 0%, #1e4fd6 100%)' }}><Printer className="w-4 h-4 mr-2" /> Print</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
