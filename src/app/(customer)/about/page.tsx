import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About — Borama Hardware',
}

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-screen-xl bg-white px-4 py-6 sm:px-6 lg:px-8">
      <h1 className="mb-6 text-3xl font-bold leading-[38px] text-stone-900">About Us</h1>
      <div className="flex max-w-2xl flex-col gap-4 text-base leading-6 text-stone-700">
        <p>
          Borama Hardware is a multi-location hardware retail platform built for Borama, Somaliland.
          We operate in the style of a comprehensive, category-rich hardware store, serving
          construction professionals and homeowners across the city.
        </p>
        <p>
          From power tools and building materials to plumbing and electrical supplies, our branches
          stock what local builders and households need — with mobile money payment, in-store
          pickup, and a loyalty program that rewards every purchase.
        </p>
        <p>
          Visit one of our branches in person, or browse the full catalog and place an order online
          for pickup.
        </p>
      </div>
    </div>
  )
}
