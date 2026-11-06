import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const prisma = new PrismaClient()

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

function daysFromNow(days: number): Date {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d
}

async function main() {
  console.log('Seeding PharmaCare...')

  // Settings
  const settings = [
    { key: 'pharmacyName', value: 'PharmaCare Pharmacy' },
    { key: 'pharmacyAddress', value: 'Plot 123, Glyn Jones Road, Lilongwe, Malawi' },
    { key: 'pharmacyPhone', value: '+265 1 700 123' },
    { key: 'pharmacyEmail', value: 'info@pharmacare.mw' },
    { key: 'pharmacyLogo', value: '' },
    { key: 'currency', value: 'MWK' },
    { key: 'currencySymbol', value: 'MK' },
    { key: 'vatPercent', value: '16.5' },
    { key: 'invoicePrefix', value: 'INV' },
    { key: 'purchasePrefix', value: 'PUR' },
    { key: 'receiptFooter', value: 'Thank you for shopping with PharmaCare. Get well soon!' },
    { key: 'lowStockThreshold', value: '15' },
    { key: 'expiryAlertDays', value: '60' },
    { key: 'timezone', value: 'Africa/Blantyre' },
    { key: 'dateFormat', value: 'DD/MM/YYYY' },
    { key: 'enableVat', value: 'true' },
    { key: 'paymentMethods', value: 'CASH,AIRTEL_MONEY,TNM_MPAMBA,BANK,CARD,CREDIT' },
  ]
  for (const s of settings) {
    await prisma.setting.upsert({ where: { key: s.key }, update: {}, create: s })
  }

  // Roles
  const roles = [
    { name: 'SUPER_ADMIN', description: 'Full system access', isSystem: true, permissions: JSON.stringify(['*']) },
    { name: 'PHARMACY_ADMIN', description: 'Manage pharmacy operations', isSystem: true, permissions: JSON.stringify(['dashboard.*','medicine.*','inventory.*','pos.*','sales.*','purchases.*','customers.*','suppliers.*','returns.*','accounts.*','reports.*','hr.*','expenses.*','services.*','notifications.*','users.*','settings.*','backup.*']) },
    { name: 'PHARMACIST', description: 'Manage medicines & dispensing', isSystem: true, permissions: JSON.stringify(['dashboard.view','medicine.*','inventory.view','pos.*','sales.*','customers.view','returns.*','reports.view']) },
    { name: 'CASHIER', description: 'POS and sales', isSystem: true, permissions: JSON.stringify(['dashboard.view','pos.*','sales.view','customers.view','services.*']) },
    { name: 'STOREKEEPER', description: 'Inventory & stock', isSystem: true, permissions: JSON.stringify(['dashboard.view','inventory.*','purchases.*','suppliers.view','returns.*','reports.view']) },
    { name: 'ACCOUNTANT', description: 'Accounts & finance', isSystem: true, permissions: JSON.stringify(['dashboard.view','accounts.*','expenses.*','reports.*','purchases.view','sales.view']) },
    { name: 'HR_MANAGER', description: 'HR & employees', isSystem: true, permissions: JSON.stringify(['dashboard.view','hr.*','users.view']) },
  ]
  for (const r of roles) {
    await prisma.role.upsert({ where: { name: r.name }, update: {}, create: r })
  }

  // Users
  const users = [
    { name: 'System Administrator', email: 'admin@pharmacare.mw', password: 'admin123', role: 'SUPER_ADMIN' },
    { name: 'Pharmacy Manager', email: 'manager@pharmacare.mw', password: 'manager123', role: 'PHARMACY_ADMIN' },
    { name: 'Dr. Jane Phiri', email: 'pharmacist@pharmacare.mw', password: 'pharm123', role: 'PHARMACIST' },
    { name: 'Grace Banda', email: 'cashier@pharmacare.mw', password: 'cashier123', role: 'CASHIER' },
    { name: 'Patrick Mwale', email: 'store@pharmacare.mw', password: 'store123', role: 'STOREKEEPER' },
    { name: 'Alice Tembo', email: 'accounts@pharmacare.mw', password: 'account123', role: 'ACCOUNTANT' },
  ]
  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { name: u.name, email: u.email, passwordHash: hashPassword(u.password), role: u.role },
    })
  }

  // Categories
  const categoryNames = ['Tablets', 'Capsules', 'Syrups', 'Injections', 'Liquids', 'Ointments', 'Creams', 'Drops', 'Medical Equipment', 'Other']
  const categories: { id: string }[] = []
  for (const name of categoryNames) {
    const c = await prisma.category.upsert({ where: { name }, update: {}, create: { name } })
    categories.push(c)
  }

  // Units
  const unitNames = ['mg', 'ml', 'g', 'kg', 'pcs', 'bottles', 'boxes', 'strips', 'packs']
  for (const name of unitNames) {
    await prisma.unit.upsert({ where: { name }, update: {}, create: { name } })
  }

  // Medicine Types
  const typeNames = ['Painkillers', 'Antibiotics', 'Antimalarials', 'Diabetes Medicines', 'Heart Medicines', 'Vitamins', 'Antihistamines', 'Other']
  for (const name of typeNames) {
    await prisma.medicineType.upsert({ where: { name }, update: {}, create: { name } })
  }

  // Manufacturers
  const manufacturers = [
    { name: 'GSK Malawi', contact: 'John Smith', phone: '+265 1 800 111', email: 'sales@gsk.mw', address: 'Kanengo, Lilongwe' },
    { name: 'Pharma Africa Ltd', contact: 'Mary Chirwa', phone: '+265 1 800 222', email: 'info@pharmaafrica.com', address: 'Ginnery Corner, Blantyre' },
    { name: 'Cipla Quality Chemical', contact: 'Raj Patel', phone: '+265 1 800 333', email: 'orders@ciplaqc.com', address: 'Makata, Blantyre' },
    { name: 'Delta Pharmaceuticals', contact: 'Sarah Nyasulu', phone: '+265 1 800 444', email: 'contact@deltapharma.mw', address: 'Chichiri, Blantyre' },
  ]
  for (const m of manufacturers) {
    await prisma.manufacturer.upsert({ where: { name: m.name }, update: {}, create: m })
  }

  // Suppliers
  const suppliers = [
    { name: 'MediSource Distributors', contactPerson: 'James Banda', phone: '+265 991 100 200', email: 'sales@medisource.mw', address: 'Area 47, Lilongwe', openingBalance: 0, creditLimit: 5000000 },
    { name: 'HealthPlus Supplies', contactPerson: 'Linda Phiri', phone: '+265 992 300 400', email: 'orders@healthplus.mw', address: 'Limbe, Blantyre', openingBalance: 0, creditLimit: 3000000 },
    { name: 'National Medical Stores', contactPerson: 'Robert Mvula', phone: '+265 993 500 600', email: 'procurement@nms.mw', address: 'Kanengo Industrial, Lilongwe', openingBalance: 0, creditLimit: 10000000 },
  ]
  for (const s of suppliers) {
    const existing = await prisma.supplier.findFirst({ where: { name: s.name } })
    if (!existing) await prisma.supplier.create({ data: s })
  }

  // Customers
  const customers = [
    { name: 'Walk-in Customer', phone: '0000', email: '', address: '', openingBalance: 0, creditLimit: 0 },
    { name: 'Lilongwe Clinic', phone: '+265 991 111 222', email: 'info@llclinic.mw', address: 'Area 10, Lilongwe', openingBalance: 0, creditLimit: 1000000 },
    { name: 'Mzimba District Hospital', phone: '+265 992 333 444', email: 'procurement@mzdh.mw', address: 'Mzimba', openingBalance: 0, creditLimit: 2000000 },
    { name: 'Grace Kachale', phone: '+265 994 555 666', email: '', address: 'Area 25, Lilongwe', openingBalance: 0, creditLimit: 50000 },
    { name: 'Blessings Nyirenda', phone: '+265 995 777 888', email: '', address: 'Chinsapo, Lilongwe', openingBalance: 0, creditLimit: 50000 },
  ]
  for (const c of customers) {
    const existing = c.phone && c.phone !== '0000' ? await prisma.customer.findUnique({ where: { phone: c.phone } }) : null
    if (existing) continue
    await prisma.customer.create({ data: c })
  }

  // Medicines
  const allUnits = await prisma.unit.findMany()
  const allCats = await prisma.category.findMany()
  const allTypes = await prisma.medicineType.findMany()
  const allManu = await prisma.manufacturer.findMany()
  const unitId = (n: string) => allUnits.find((u) => u.name === n)?.id
  const catId = (n: string) => allCats.find((c) => c.name === n)?.id
  const typeId = (n: string) => allTypes.find((t) => t.name === n)?.id
  const manuId = (n: string) => allManu.find((m) => m.name === n)?.id

  const medicines = [
    { name: 'Paracetamol 500mg', genericName: 'Paracetamol', category: 'Tablets', type: 'Painkillers', manufacturer: 'Pharma Africa Ltd', unit: 'mg', barcode: '6001234500011', productCode: 'MED001', purchasePrice: 150, sellingPrice: 250, minStockLevel: 50, boxQuantity: 1000, stripsPerBox: 100, tabletsPerStrip: 10 },
    { name: 'Amoxicillin 500mg', genericName: 'Amoxicillin', category: 'Capsules', type: 'Antibiotics', manufacturer: 'Cipla Quality Chemical', unit: 'mg', barcode: '6001234500028', productCode: 'MED002', purchasePrice: 800, sellingPrice: 1200, minStockLevel: 30, boxQuantity: 500, stripsPerBox: 50, tabletsPerStrip: 10 },
    { name: 'Artemether-Lumefantrine', genericName: 'Artemether/Lumefantrine', category: 'Tablets', type: 'Antimalarials', manufacturer: 'Cipla Quality Chemical', unit: 'mg', barcode: '6001234500035', productCode: 'MED003', purchasePrice: 1200, sellingPrice: 1800, minStockLevel: 40, boxQuantity: 600, stripsPerBox: 60, tabletsPerStrip: 10, prescription: true },
    { name: 'Ibuprofen 400mg', genericName: 'Ibuprofen', category: 'Tablets', type: 'Painkillers', manufacturer: 'Delta Pharmaceuticals', unit: 'mg', barcode: '6001234500042', productCode: 'MED004', purchasePrice: 200, sellingPrice: 350, minStockLevel: 50, boxQuantity: 1000, stripsPerBox: 100, tabletsPerStrip: 10 },
    { name: 'Metformin 850mg', genericName: 'Metformin', category: 'Tablets', type: 'Diabetes Medicines', manufacturer: 'GSK Malawi', unit: 'mg', barcode: '6001234500059', productCode: 'MED005', purchasePrice: 500, sellingPrice: 800, minStockLevel: 30, boxQuantity: 500, stripsPerBox: 50, tabletsPerStrip: 10, prescription: true },
    { name: 'Amlodipine 5mg', genericName: 'Amlodipine', category: 'Tablets', type: 'Heart Medicines', manufacturer: 'GSK Malawi', unit: 'mg', barcode: '6001234500066', productCode: 'MED006', purchasePrice: 600, sellingPrice: 950, minStockLevel: 25, boxQuantity: 300, stripsPerBox: 30, tabletsPerStrip: 10, prescription: true },
    { name: 'Vitamin C 1000mg', genericName: 'Ascorbic Acid', category: 'Tablets', type: 'Vitamins', manufacturer: 'Delta Pharmaceuticals', unit: 'mg', barcode: '6001234500073', productCode: 'MED007', purchasePrice: 300, sellingPrice: 500, minStockLevel: 40, boxQuantity: 500, stripsPerBox: 50, tabletsPerStrip: 10 },
    { name: 'Cetirizine 10mg', genericName: 'Cetirizine', category: 'Tablets', type: 'Antihistamines', manufacturer: 'Pharma Africa Ltd', unit: 'mg', barcode: '6001234500080', productCode: 'MED008', purchasePrice: 250, sellingPrice: 400, minStockLevel: 30, boxQuantity: 500, stripsPerBox: 50, tabletsPerStrip: 10 },
    { name: 'Cough Syrup 100ml', genericName: 'Dextromethorphan', category: 'Syrups', type: 'Other', manufacturer: 'Delta Pharmaceuticals', unit: 'ml', barcode: '6001234500097', productCode: 'MED009', purchasePrice: 1200, sellingPrice: 2000, minStockLevel: 20, boxQuantity: 50 },
    { name: 'ORS Sachets', genericName: 'Oral Rehydration Salts', category: 'Other', type: 'Other', manufacturer: 'Cipla Quality Chemical', unit: 'pcs', barcode: '6001234500103', productCode: 'MED010', purchasePrice: 100, sellingPrice: 200, minStockLevel: 100, boxQuantity: 1000 },
    { name: 'Amoxicillin Syrup 125mg/5ml', genericName: 'Amoxicillin', category: 'Syrups', type: 'Antibiotics', manufacturer: 'Cipla Quality Chemical', unit: 'ml', barcode: '6001234500110', productCode: 'MED011', purchasePrice: 1500, sellingPrice: 2500, minStockLevel: 20, boxQuantity: 50, prescription: true },
    { name: 'Diclofenac Gel 30g', genericName: 'Diclofenac', category: 'Ointments', type: 'Painkillers', manufacturer: 'Pharma Africa Ltd', unit: 'g', barcode: '6001234500127', productCode: 'MED012', purchasePrice: 900, sellingPrice: 1500, minStockLevel: 25, boxQuantity: 50 },
    { name: 'Insulin Pen 100IU/ml', genericName: 'Insulin Glargine', category: 'Injections', type: 'Diabetes Medicines', manufacturer: 'GSK Malawi', unit: 'ml', barcode: '6001234500134', productCode: 'MED013', purchasePrice: 8000, sellingPrice: 11000, minStockLevel: 15, boxQuantity: 50, prescription: true },
    { name: 'Digital Thermometer', genericName: 'Thermometer', category: 'Medical Equipment', type: 'Other', manufacturer: 'Delta Pharmaceuticals', unit: 'pcs', barcode: '6001234500141', productCode: 'MED014', purchasePrice: 2500, sellingPrice: 4500, minStockLevel: 10, boxQuantity: 100 },
    { name: 'Surgical Gloves (Box)', genericName: 'Nitrile Gloves', category: 'Medical Equipment', type: 'Other', manufacturer: 'Pharma Africa Ltd', unit: 'boxes', barcode: '6001234500158', productCode: 'MED015', purchasePrice: 3500, sellingPrice: 5500, minStockLevel: 20, boxQuantity: 50 },
  ]

  for (const m of medicines) {
    const data = {
      name: m.name,
      genericName: m.genericName,
      categoryId: catId(m.category),
      typeId: typeId(m.type),
      manufacturerId: manuId(m.manufacturer),
      unitId: unitId(m.unit),
      barcode: m.barcode,
      productCode: m.productCode,
      purchasePrice: m.purchasePrice,
      sellingPrice: m.sellingPrice,
      minStockLevel: m.minStockLevel,
      boxQuantity: m.boxQuantity,
      stripsPerBox: m.stripsPerBox ?? 0,
      tabletsPerStrip: m.tabletsPerStrip ?? 0,
      prescription: m.prescription ?? false,
    }
    await prisma.medicine.upsert({ where: { barcode: m.barcode }, update: {}, create: data })
  }

  // Create batches with stock for each medicine
  const allMeds = await prisma.medicine.findMany()
  const supplier1 = await prisma.supplier.findFirst({ where: { name: 'MediSource Distributors' } })
  for (const med of allMeds) {
    const existing = await prisma.batch.findFirst({ where: { medicineId: med.id } })
    if (existing) continue
    const expiryDays = [120, 300, 540][Math.floor(Math.random() * 3)]
    await prisma.batch.create({
      data: {
        batchNumber: `BTH-${med.productCode?.slice(-3)}-${new Date().getFullYear()}`,
        medicineId: med.id,
        supplierId: supplier1?.id,
        manufactureDate: daysFromNow(-180),
        expiryDate: daysFromNow(expiryDays),
        purchasePrice: med.purchasePrice,
        sellingPrice: med.sellingPrice,
        quantityPurchased: med.minStockLevel * 3,
        availableQty: med.minStockLevel * 2 + Math.floor(Math.random() * 30),
        status: 'ACTIVE',
      },
    })
  }

  // Low stock medicine (Paracetamol) for demo alert
  const para = await prisma.medicine.findUnique({ where: { barcode: '6001234500011' } })
  if (para) {
    const batch = await prisma.batch.findFirst({ where: { medicineId: para.id } })
    if (batch) {
      await prisma.batch.update({ where: { id: batch.id }, data: { availableQty: 8 } })
    }
  }
  // Expiring soon medicine (Ibuprofen)
  const ibu = await prisma.medicine.findUnique({ where: { barcode: '6001234500042' } })
  if (ibu) {
    const batch = await prisma.batch.findFirst({ where: { medicineId: ibu.id } })
    if (batch) {
      await prisma.batch.update({ where: { id: batch.id }, data: { expiryDate: daysFromNow(25) } })
    }
  }

  // Accounts (chart of accounts)
  const accounts = [
    { code: '1000', name: 'Cash in Hand', type: 'ASSET' },
    { code: '1010', name: 'Airtel Money', type: 'ASSET' },
    { code: '1020', name: 'TNM Mpamba', type: 'ASSET' },
    { code: '1030', name: 'Bank Account', type: 'ASSET' },
    { code: '1100', name: 'Accounts Receivable', type: 'ASSET' },
    { code: '1200', name: 'Inventory', type: 'ASSET' },
    { code: '2000', name: 'Accounts Payable', type: 'LIABILITY' },
    { code: '3000', name: 'Owner Equity', type: 'EQUITY' },
    { code: '4000', name: 'Sales Revenue', type: 'INCOME' },
    { code: '4100', name: 'Service Revenue', type: 'INCOME' },
    { code: '5000', name: 'Cost of Goods Sold', type: 'EXPENSE' },
    { code: '6000', name: 'Rent Expense', type: 'EXPENSE' },
    { code: '6100', name: 'Electricity Expense', type: 'EXPENSE' },
    { code: '6200', name: 'Salaries Expense', type: 'EXPENSE' },
    { code: '6300', name: 'Transport Expense', type: 'EXPENSE' },
    { code: '6400', name: 'Other Expenses', type: 'EXPENSE' },
  ]
  for (const a of accounts) {
    await prisma.account.upsert({ where: { code: a.code }, update: {}, create: a })
  }

  // Expense categories
  const expCats = ['Rent', 'Electricity', 'Water', 'Salaries', 'Transport', 'Internet', 'Maintenance', 'Other']
  for (const name of expCats) {
    await prisma.expenseCategory.upsert({ where: { name }, update: {}, create: { name } })
  }

  // Services
  const services = [
    { name: 'Blood Pressure Check', description: 'Blood pressure measurement service', charge: 500, vatPercent: 0 },
    { name: 'Blood Glucose Testing', description: 'Blood sugar level test', charge: 1000, vatPercent: 0 },
    { name: 'BMI Assessment', description: 'Body Mass Index assessment', charge: 300, vatPercent: 0 },
    { name: 'Wound Dressing', description: 'Minor wound cleaning and dressing', charge: 1500, vatPercent: 0 },
  ]
  for (const s of services) {
    await prisma.service.upsert({ where: { name: s.name }, update: {}, create: s })
  }

  // Employees
  const employees = [
    { employeeCode: 'EMP001', name: 'Grace Banda', phone: '+265 991 222 333', email: 'grace@pharmacare.mw', position: 'Cashier', department: 'Sales', salary: 250000 },
    { employeeCode: 'EMP002', name: 'Patrick Mwale', phone: '+265 992 333 444', email: 'patrick@pharmacare.mw', position: 'Storekeeper', department: 'Inventory', salary: 280000 },
    { employeeCode: 'EMP003', name: 'Alice Tembo', phone: '+265 993 444 555', email: 'alice@pharmacare.mw', position: 'Accountant', department: 'Finance', salary: 350000 },
    { employeeCode: 'EMP004', name: 'Dr. Jane Phiri', phone: '+265 994 555 666', email: 'jane@pharmacare.mw', position: 'Pharmacist', department: 'Pharmacy', salary: 450000 },
  ]
  for (const e of employees) {
    await prisma.employee.upsert({ where: { employeeCode: e.employeeCode }, update: {}, create: { ...e, joiningDate: daysFromNow(-200) } })
  }

  console.log('Seed complete. Admin login: admin@pharmacare.mw / admin123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
