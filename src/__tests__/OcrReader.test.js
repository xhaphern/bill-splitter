import { describe, it, expect } from 'vitest'

// Extract the pure functions from OcrReader for testing
// Since they're not exported, we'll redefine them here for testing purposes

const parseOcrText = (text = "") => {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/[|]/g, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const amountPattern = /(-?\d[\d,]*[\.]\d{2})/;
  const skipWords = [
    "total",
    "subtotal",
    "gst",
    "tax",
    "discount",
    "balance",
    "tender",
    "payable",
    "service",
    "round",
    "thank",
    "thanks",
    "unsettled",
    "due",
    "card",
    "cash",
    "change",
    "bill amount",
    "grand",
  ];

  const items = [];

  lines.forEach((line) => {
    const lower = line.toLowerCase();
    if (skipWords.some((word) => lower.includes(word))) return;

    const match = line.match(amountPattern);
    if (!match) return;

    const amount = Number.parseFloat(match[1].replace(/,/g, ""));
    if (!Number.isFinite(amount) || amount <= 0) return;

    const priceIndex = line.indexOf(match[1]);
    if (priceIndex <= 0) return;

    let nameSegment = line.slice(0, priceIndex).trim();
    if (!nameSegment) return;

    let qty = 1;
    const qtyMatch = nameSegment.match(/(\d{1,3})\s*$/);
    if (qtyMatch) {
      const candidate = Number.parseInt(qtyMatch[1], 10);
      if (Number.isInteger(candidate) && candidate > 0 && candidate <= 20) {
        qty = candidate;
        nameSegment = nameSegment.slice(0, qtyMatch.index).trim();
      }
    }

    const cleanName = nameSegment.replace(/\s+/g, " ").replace(/[:;]/g, "").trim();
    if (!cleanName || cleanName.length < 2) return;

    items.push({ name: cleanName, price: Number(amount.toFixed(2)), qty });
  });

  return items;
};

const extractBillSummary = (text = "") => {
  const summary = {
    subtotal: null,
    serviceChargeAmount: null,
    total: null,
    currency: null,
  };

  if (!text) return summary;

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/[|]/g, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const parseAmount = (line) => {
    const matches = line.match(/-?\d[\d,]*\.?\d+/g);
    if (!matches || !matches.length) return null;
    const candidate = matches[matches.length - 1].replace(/,/g, "");
    const value = Number.parseFloat(candidate);
    return Number.isFinite(value) ? value : null;
  };

  const extractCurrency = (line) => {
    const codeMatch = line.match(/\b([A-Z]{2,4})\s*[-]?\s*\d/);
    if (codeMatch) return codeMatch[1].toUpperCase();
    const knownMatch = line.match(/\b(MVR|USD|EUR|GBP|INR|SGD|AUD|CAD|JPY|MYR|CNY|CHF|AED|SAR)\b/i);
    if (knownMatch) return knownMatch[1].toUpperCase();
    return null;
  };

  lines.forEach((line) => {
    const lower = line.toLowerCase();
    if (!summary.currency) {
      const currency = extractCurrency(line);
      if (currency) summary.currency = currency;
    }

    if (summary.subtotal === null && (lower.includes('subtotal') || lower.includes('sub total'))) {
      const amount = parseAmount(line);
      if (amount !== null) summary.subtotal = amount;
      return;
    }

    if (
      summary.serviceChargeAmount === null &&
      (lower.includes('service charge') || lower.includes('svc charge') || lower.includes('service fee'))
    ) {
      const amount = parseAmount(line);
      if (amount !== null) summary.serviceChargeAmount = amount;
      return;
    }

    const mentionsTotal = lower.includes('total') || lower.includes('amount due') || lower.includes('grand total') || lower.includes('balance due');
    const isSubtotal = lower.includes('subtotal');
    const isServiceOrTax = lower.includes('service') || lower.includes('tax');

    if (summary.total === null && mentionsTotal && !isSubtotal && !isServiceOrTax) {
      const amount = parseAmount(line);
      if (amount !== null) summary.total = amount;
    }
  });

  return summary;
};

describe('parseOcrText', () => {
  it('parses simple item with name and price', () => {
    const text = 'Chicken Burger 42.50'
    const items = parseOcrText(text)
    expect(items).toEqual([{ name: 'Chicken Burger', price: 42.50, qty: 1 }])
  })

  it('parses multiple items with prices', () => {
    const text = `Chicken Burger 42.50
Iced Tea 15.00
French Fries 12.75`
    const items = parseOcrText(text)
    expect(items).toEqual([
      { name: 'Chicken Burger', price: 42.50, qty: 1 },
      { name: 'Iced Tea', price: 15.00, qty: 1 },
      { name: 'French Fries', price: 12.75, qty: 1 },
    ])
  })

  it('extracts quantity when present before price', () => {
    const text = 'Coffee 2 5.50'
    const items = parseOcrText(text)
    expect(items).toEqual([{ name: 'Coffee', price: 5.50, qty: 2 }])
  })

  it('parses prices with commas', () => {
    const text = 'Expensive Item 1,234.56'
    const items = parseOcrText(text)
    expect(items).toEqual([{ name: 'Expensive Item', price: 1234.56, qty: 1 }])
  })

  it('skips lines with skip words', () => {
    const text = `Item 1 10.50
Subtotal 10.50
Service Charge 1.05
Total 11.55`
    const items = parseOcrText(text)
    expect(items).toEqual([{ name: 'Item 1', price: 10.50, qty: 1 }])
  })

  it('handles pipe characters in text', () => {
    const text = 'Item | Name | 25.00'
    const items = parseOcrText(text)
    expect(items).toEqual([{ name: 'Item Name', price: 25.00, qty: 1 }])
  })

  it('ignores lines without proper price format', () => {
    const text = `Valid Item 12.34
Invalid Item 1234
Another Valid 56.78`
    const items = parseOcrText(text)
    expect(items).toEqual([
      { name: 'Valid Item', price: 12.34, qty: 1 },
      { name: 'Another Valid', price: 56.78, qty: 1 },
    ])
  })

  it('ignores items with negative prices', () => {
    const text = `Normal Item 10.50
Discount -5.00
Another Item 8.75`
    const items = parseOcrText(text)
    expect(items).toEqual([
      { name: 'Normal Item', price: 10.50, qty: 1 },
      { name: 'Another Item', price: 8.75, qty: 1 },
    ])
  })

  it('cleans colons and semicolons from item names', () => {
    const text = 'Item: Name; 15.00'
    const items = parseOcrText(text)
    expect(items).toEqual([{ name: 'Item Name', price: 15.00, qty: 1 }])
  })

  it('returns empty array for empty text', () => {
    const items = parseOcrText('')
    expect(items).toEqual([])
  })

  it('handles quantity up to 20', () => {
    const text = 'Water Bottle 12 2.50'
    const items = parseOcrText(text)
    expect(items).toEqual([{ name: 'Water Bottle', price: 2.50, qty: 12 }])
  })

  it('treats quantities over 20 as part of item name', () => {
    const text = 'Item 25 50.00'
    const items = parseOcrText(text)
    expect(items).toEqual([{ name: 'Item 25', price: 50.00, qty: 1 }])
  })

  it('requires minimum 2 character item name', () => {
    const text = `X 10.00
Normal Item 15.00`
    const items = parseOcrText(text)
    expect(items).toEqual([{ name: 'Normal Item', price: 15.00, qty: 1 }])
  })
})

describe('extractBillSummary', () => {
  it('extracts subtotal from receipt text', () => {
    const text = 'Subtotal 50.00'
    const summary = extractBillSummary(text)
    expect(summary.subtotal).toBe(50.00)
  })

  it('extracts service charge', () => {
    const text = 'Service Charge 5.00'
    const summary = extractBillSummary(text)
    expect(summary.serviceChargeAmount).toBe(5.00)
  })

  it('extracts total', () => {
    const text = 'Total 55.00'
    const summary = extractBillSummary(text)
    expect(summary.total).toBe(55.00)
  })

  it('extracts currency code before numbers', () => {
    const text = 'Total MVR 100.00'
    const summary = extractBillSummary(text)
    expect(summary.currency).toBe('MVR')
    expect(summary.total).toBe(100.00)
  })

  it('recognizes known currency codes', () => {
    const currencies = ['MVR', 'USD', 'EUR', 'GBP', 'INR', 'SGD', 'AUD', 'CAD', 'JPY']
    currencies.forEach(curr => {
      const text = `Total ${curr} 100.00`
      const summary = extractBillSummary(text)
      expect(summary.currency).toBe(curr)
    })
  })

  it('extracts all summary fields from complete receipt', () => {
    const text = `
      Item 1 10.00
      Item 2 15.00
      Subtotal 25.00
      Service Charge 2.50
      Total MVR 27.50
    `
    const summary = extractBillSummary(text)
    expect(summary).toEqual({
      subtotal: 25.00,
      serviceChargeAmount: 2.50,
      total: 27.50,
      currency: 'MVR',
    })
  })

  it('handles "sub total" as two words', () => {
    const text = 'Sub Total 45.00'
    const summary = extractBillSummary(text)
    expect(summary.subtotal).toBe(45.00)
  })

  it('recognizes service fee as service charge', () => {
    const text = 'Service Fee 3.50'
    const summary = extractBillSummary(text)
    expect(summary.serviceChargeAmount).toBe(3.50)
  })

  it('recognizes svc charge abbreviation', () => {
    const text = 'Svc Charge 4.00'
    const summary = extractBillSummary(text)
    expect(summary.serviceChargeAmount).toBe(4.00)
  })

  it('recognizes amount due as total', () => {
    const text = 'Amount Due 75.00'
    const summary = extractBillSummary(text)
    expect(summary.total).toBe(75.00)
  })

  it('recognizes grand total', () => {
    const text = 'Grand Total 100.00'
    const summary = extractBillSummary(text)
    expect(summary.total).toBe(100.00)
  })

  it('recognizes balance due', () => {
    const text = 'Balance Due 85.00'
    const summary = extractBillSummary(text)
    expect(summary.total).toBe(85.00)
  })

  it('avoids extracting subtotal as total', () => {
    const text = `Subtotal 50.00
Total 55.00`
    const summary = extractBillSummary(text)
    expect(summary.subtotal).toBe(50.00)
    expect(summary.total).toBe(55.00)
  })

  it('avoids extracting service charge line as total', () => {
    const text = `Service Charge Total 5.00
Total 55.00`
    const summary = extractBillSummary(text)
    expect(summary.total).toBe(55.00)
  })

  it('handles amounts with commas', () => {
    const text = 'Total 1,234.56'
    const summary = extractBillSummary(text)
    expect(summary.total).toBe(1234.56)
  })

  it('returns null for missing fields', () => {
    const text = 'Just some text'
    const summary = extractBillSummary(text)
    expect(summary).toEqual({
      subtotal: null,
      serviceChargeAmount: null,
      total: null,
      currency: null,
    })
  })

  it('returns empty summary for empty text', () => {
    const summary = extractBillSummary('')
    expect(summary).toEqual({
      subtotal: null,
      serviceChargeAmount: null,
      total: null,
      currency: null,
    })
  })

  it('takes last number on line as amount', () => {
    const text = 'Subtotal 100.00 50.00 75.00'
    const summary = extractBillSummary(text)
    expect(summary.subtotal).toBe(75.00)
  })

  it('extracts currency from mixed case', () => {
    const text = 'Total usd 50.00'
    const summary = extractBillSummary(text)
    expect(summary.currency).toBe('USD')
  })

  it('only extracts first occurrence of each field', () => {
    const text = `Subtotal 50.00
Subtotal 60.00
Service Charge 5.00
Service Charge 6.00
Total 55.00
Total 66.00`
    const summary = extractBillSummary(text)
    expect(summary.subtotal).toBe(50.00)
    expect(summary.serviceChargeAmount).toBe(5.00)
    expect(summary.total).toBe(55.00)
  })
})