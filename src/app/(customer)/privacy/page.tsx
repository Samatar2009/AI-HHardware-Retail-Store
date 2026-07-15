import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy — Borama Hardware',
}

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-screen-xl bg-white px-4 py-6 sm:px-6 lg:px-8">
      <h1 className="mb-6 text-3xl font-bold leading-[38px] text-stone-900">Privacy Policy</h1>
      <div className="flex max-w-2xl flex-col gap-6 text-base leading-6 text-stone-700">
        <section>
          <h2 className="mb-2 text-lg font-semibold text-stone-900">What we collect</h2>
          <p>
            To create an account, we collect your phone number for sign-in verification, and your
            name once you complete your profile. When you place an order, we record the items,
            pickup location, payment method, and any mobile money reference you provide to confirm
            payment.
          </p>
        </section>
        <section>
          <h2 className="mb-2 text-lg font-semibold text-stone-900">How we use it</h2>
          <p>
            Your information is used to process orders, confirm payments, award and track loyalty
            points, notify you by SMS about order status, and improve the products and service we
            offer. We do not sell your personal information to third parties.
          </p>
        </section>
        <section>
          <h2 className="mb-2 text-lg font-semibold text-stone-900">Who can see your data</h2>
          <p>
            Your order and account data is only accessible to you and to authorized Borama Hardware
            staff who need it to fulfill your order or provide support. Staff access is
            role-restricted and logged.
          </p>
        </section>
        <section>
          <h2 className="mb-2 text-lg font-semibold text-stone-900">Contact us</h2>
          <p>
            If you have questions about your data or would like it removed, visit any branch listed
            on our{' '}
            <a href="/contact" className="font-medium text-orange-600 hover:text-orange-700">
              Contact page
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  )
}
