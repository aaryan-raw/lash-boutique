import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CartProvider, useCart, CART_KEY } from "@/components/CartProvider";
import Gallery from "@/components/Gallery";
import ProductPurchase from "@/components/ProductPurchase";
import { devProducts } from "@/lib/dev-products";
const getBySlug = (s: string) => devProducts.find((p) => p.slug === s);
beforeEach(() => localStorage.clear()); afterEach(cleanup);
const Probe = () => { const c = useCart(); return <div><output data-testid="n">{c.count}</output><button onClick={() => c.add("A", 2)}>add</button><button onClick={() => c.setQty("A", 1)}>set1</button><button onClick={() => c.remove("A")}>rm</button></div>; };
describe("cart", () => {
  it("add, update, remove", async () => { const u = userEvent.setup(); render(<CartProvider><Probe /></CartProvider>);
    await u.click(screen.getByText("add")); expect(screen.getByTestId("n").textContent).toBe("2");
    await u.click(screen.getByText("set1")); expect(screen.getByTestId("n").textContent).toBe("1");
    await u.click(screen.getByText("rm")); expect(screen.getByTestId("n").textContent).toBe("0"); });
  it("persists across remount (refresh) and survives corrupt storage", async () => { const u = userEvent.setup(); const a = render(<CartProvider><Probe /></CartProvider>); await u.click(screen.getByText("add")); a.unmount();
    render(<CartProvider><Probe /></CartProvider>); expect(await screen.findByText("2")).toBeTruthy(); cleanup();
    localStorage.setItem(CART_KEY, "{bad"); render(<CartProvider><Probe /></CartProvider>); expect(screen.getByTestId("n").textContent).toBe("0"); });
});
describe("gallery", () => {
  it("thumbnail and next/prev change the shown image", async () => { const u = userEvent.setup(); const p = getBySlug("sample-kurti-sage")!; render(<Gallery images={p.images} />);
    await u.click(screen.getByLabelText(/Show image 3/)); expect(screen.getByRole("status").textContent).toContain("3 of 3");
    await u.click(screen.getByLabelText("Next image")); expect(screen.getByRole("status").textContent).toContain("1 of 3"); });
});
describe("variant selection", () => {
  const setup = (slug: string) => { render(<CartProvider><ProductPurchase product={getBySlug(slug)!} waHref="#" /></CartProvider>); return userEvent.setup(); };
  it("cannot add until a size is selected; sold-out size is disabled", async () => { const u = setup("sample-kurti-sage");
    expect((screen.getByRole("button", { name: "Select a size" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: /^XL/ }) as HTMLButtonElement).disabled).toBe(true);
    await u.click(screen.getByRole("button", { name: "S" })); expect((screen.getByRole("button", { name: "Add to cart" }) as HTMLButtonElement).disabled).toBe(false); });
  it("quantity cannot exceed stock (S has 2)", async () => { const u = setup("sample-kurti-sage"); await u.click(screen.getByRole("button", { name: "S" }));
    const inc = screen.getByLabelText("Increase quantity") as HTMLButtonElement; await u.click(inc); expect(inc.disabled).toBe(true); expect(screen.getByText("Only 2 left")).toBeTruthy(); });
  it("add to cart enforces remaining stock after adding", async () => { const u = setup("sample-saree-champagne"); await u.click(screen.getByRole("button", { name: "Free size" })); await u.click(screen.getByRole("button", { name: "Add to cart" }));
    expect((screen.getByRole("button", { name: "Maximum in cart" }) as HTMLButtonElement).disabled).toBe(true); });
  it("fully out-of-stock product cannot be purchased", () => { setup("sample-kurti-burgundy"); expect((screen.getByRole("button", { name: "Out of stock" }) as HTMLButtonElement).disabled).toBe(true); });
});
