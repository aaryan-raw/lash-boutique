-- Sales reporting queries (read-only). Run in your database console, e.g.  psql "$DATABASE_URL" -f db/reports.sql
-- "Counted" orders are those the shop is committed to fulfil (confirmed, packed, shipped, delivered). COD orders count once the owner confirms them.

-- 1. Weekly orders, revenue and average order value
select date_trunc('week', created_at)::date as week, count(*) as orders, sum(total) as revenue_inr, round(avg(total)) as avg_order_value_inr
from orders where status in ('confirmed','packed','shipped','delivered') group by 1 order by 1 desc;

-- 2. Payment mix (online vs cash on delivery)
select payment_method, count(*) as orders, sum(total) as revenue_inr
from orders where status in ('confirmed','packed','shipped','delivered') group by 1;

-- 3. Cancellation and return rate by week
select date_trunc('week', created_at)::date as week, count(*) as all_orders,
       count(*) filter (where status = 'cancelled') as cancelled, count(*) filter (where status = 'returned') as returned,
       round(100.0 * count(*) filter (where status in ('cancelled','returned')) / count(*), 1) as pct_cancelled_or_returned
from orders group by 1 order by 1 desc;

-- 4. Best sellers (units and revenue)
select i.name, sum(i.qty) as units, sum(i.qty * i.unit_price) as revenue_inr
from order_items i join orders o on o.id = i.order_id
where o.status in ('confirmed','packed','shipped','delivered') group by i.name order by units desc limit 20;

-- 5. Low stock on published products (restock list)
select p.name, v.sku, v.size, v.colour, v.stock from variants v join products p on p.id = v.product_id
where p.status = 'active' and v.stock <= 2 order by v.stock, p.name;

-- 6. Orders needing attention: unpaid online orders holding stock, and payments received after cancellation (refund needed)
select ref, status, payment_status, total, created_at from orders
where status = 'pending_payment' or payment_status = 'paid_after_cancel' order by created_at;

-- 7. Repeat customers (by phone)
select customer->>'phone' as phone, count(*) as orders, sum(total) as spent_inr
from orders where status in ('confirmed','packed','shipped','delivered') group by 1 having count(*) > 1 order by orders desc;
