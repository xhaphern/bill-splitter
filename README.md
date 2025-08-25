# Bill Splitter

[![Deploy to GitHub Pages](https://github.com/xhaphern/bill-splitter/actions/workflows/deploy.yml/badge.svg)](https://github.com/xhaphern/bill-splitter/actions/workflows/deploy.yml)
[![Docs – Wiki](https://img.shields.io/badge/docs-wiki-brightgreen.svg)](https://github.com/xhaphern/bill-splitter/wiki)

Split bills fairly among friends with an itemized breakdown. Add friends (with optional account numbers), add items via a form, pick a payer, and export a clean PNG/JPEG of the final table.

**Live demo:** https://xhaphern.github.io/bill-splitter/

> Built with React, Vite, Tailwind CSS. Auto-deployed to GitHub Pages via GitHub Actions.

---

## 📚 Documentation

- [Home (Overview)](https://github.com/xhaphern/bill-splitter/wiki)
- [Installation](https://github.com/xhaphern/bill-splitter/wiki/Installation)
- [Usage Guide](https://github.com/xhaphern/bill-splitter/wiki/Usage-Guide)
- [Deployment](https://github.com/xhaphern/bill-splitter/wiki/Deployment)
- [Roadmap](https://github.com/xhaphern/bill-splitter/wiki/Roadmap)

---

## Features

- 👥 **Friends manager** – add/remove friends; persist locally (name + optional account no.)
- 🧾 **Item form** – name, qty, price, and select which friends share each item
- 🧮 **Auto-split** – per-friend shares; proportional discounts, service charge, and GST
- 💳 **Payer** – select who paid; show *only* payer’s account number in the header
- 🧰 **Settings** – currency, Discount 1, Service Charge, Discount 2, GST
- 📤 **Export** – one-click PNG/JPEG export of the final table (no Edit/Delete buttons in export)
- 💾 **Save/Load** – export/import JSON snapshot
- 🧠 **Local persistence** – friends & current bill saved in `localStorage`

---

## Quick Start (local)

```bash
git clone https://github.com/xhaphern/bill-splitter.git
cd bill-splitter
npm install
npm run dev
