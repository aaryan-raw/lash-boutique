# Owner guide

Sign in at `https://<your-site>/admin/login`. Use a long unique password; there is one owner account.

## One-time setup
**Shipping:** open *Shipping*. Enter the delivery charge, an optional "free above" amount, and the PIN-code prefixes you deliver to (for example `695, 686`). Customers outside these areas cannot order. Checkout stays off until this is saved.

## Adding a product
*Products > New product*.
- **Name, URL slug** (lowercase, hyphens, e.g. `green-cotton-kurti`), **category**, **price** (whole rupees), optional **sale price** (must be lower).
- **Variants:** one line per size/colour: `SKU, size, colour, stock`, e.g. `GCK-M, M, Green, 4`. SKUs must be unique across the shop. A saree can be one line `SAR-01, Free size, Ivory, 3`.
- **Images:** one per line: `alt text | https://link-to-photo`. The link must be https. The first image is the main one. Alt text describes the photo (for accessibility and search).
- Tick **New arrival**, **Bestseller**, **Featured** to place it on the home page and collections.
- Set **Status** to *Published* to show it. *Archived / draft* hides it but keeps order history.

## Managing stock
Open the product, change the stock number on the variant line, Save. The number you type **replaces** the current stock, so do not edit it while an order for that item is being placed; check *Orders* first. Stock drops automatically when an order is placed and returns if the order is cancelled. A size at 0 shows as sold out; a product with every size at 0 shows "Out of stock".
Run `db/reports.sql` query 5 for a restock list.

## Handling orders
*Orders* lists newest first; search by reference, customer name or phone; filter by status. Open an order to see items, the customer's phone and address, and the history.
- **Online (Razorpay) order:** becomes *confirmed* automatically once payment is verified. If a customer abandons payment, the order is *pending payment* and the stock is held for about 30 minutes, then released.
- **Cash on delivery order** (only if you enable COD): arrives as *placed*. Call or WhatsApp the customer, then press **Mark confirmed**.
- Then **Mark packed**, **Mark shipped** (type the courier and tracking number in the note: tracking is manual), **Mark delivered**.
- **Cancel** (before shipping) returns the stock. If the order was paid online, the page tells you to **refund it in the Razorpay dashboard**; refunds are not automatic. An order marked *payment received after cancellation* also needs a refund.
- **Returned** (after shipping) does **not** put stock back automatically; check the item, then adjust stock on the product.
Customers see only their reference, items, totals and status at `/order/<reference>`; never their phone or address.

## Contact and store
Phone, WhatsApp and directions links use +91 99957 82624. Confirm this is a WhatsApp number. Opening hours and policies are placeholders until you supply them.
