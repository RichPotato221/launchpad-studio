import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact & Visit — Throne Room of God Kingdom Center" },
      { name: "description", content: "Visit Throne Room of God Kingdom Center in Cedar Hollow, or reach out with a question, prayer request, or hello." },
      { property: "og:title", content: "Contact Throne Room of God Kingdom Center" },
      { property: "og:description", content: "Say hello, ask a question, or plan your visit." },
    ],
  }),
  component: Contact,
});

function Contact() {
  const [sent, setSent] = useState(false);

  return (
    <>
      <section className="container-editorial pb-16 pt-24 md:pt-32">
        <p className="eyebrow">Say hello</p>
        <h1 className="mt-4 max-w-4xl font-serif text-5xl leading-tight md:text-7xl">
          We'd love to <em className="text-terracotta">hear from you</em>.
        </h1>
      </section>

      <section className="container-editorial grid gap-16 pb-24 md:grid-cols-12">
        <div className="space-y-10 md:col-span-5">
          <div>
            <p className="eyebrow">Visit</p>
            <address className="mt-4 not-italic text-base leading-relaxed text-foreground">
              Throne Room of God Kingdom Center<br />
              Throne Room of God Kingdom Center<br />
              Contact us for our physical address
            </address>
          </div>
          <div>
            <p className="eyebrow">Reach us</p>
            <p className="mt-4 text-base leading-relaxed text-foreground">
              hello@trogkc.org<br />
              +1 (000) 000-0000
            </p>
          </div>
          <div>
            <p className="eyebrow">Office hours</p>
            <p className="mt-4 text-base leading-relaxed text-foreground">
              Tues – Fri, 10:00 – 4:00<br />
              Sundays before & after services
            </p>
          </div>
          <div>
            <p className="eyebrow">Prayer requests</p>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Anything you send is held in confidence by the pastoral team.
              We'll pray with you — and, if you'd like, keep you in mind through the week.
            </p>
          </div>
        </div>

        <form
          className="border border-border bg-card p-8 md:col-span-7 md:p-12"
          onSubmit={(e) => {
            e.preventDefault();
            setSent(true);
          }}
        >
          {sent ? (
            <div className="flex min-h-[320px] flex-col items-start justify-center">
              <p className="eyebrow">Message received</p>
              <h2 className="mt-4 font-serif text-3xl">Thank you.</h2>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
                Someone from Throne Room of God Kingdom Center will be in touch soon. In the meantime,
                you're warmly invited to Sunday's service.
              </p>
            </div>
          ) : (
            <>
              <p className="eyebrow">Send a note</p>
              <h2 className="mt-2 font-serif text-3xl">A question, a hello, a request for prayer.</h2>

              <div className="mt-8 space-y-6">
                <Field label="Your name" name="name" />
                <Field label="Email" name="email" type="email" />
                <Field label="Subject" name="subject" />
                <div>
                  <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground" htmlFor="message">
                    Message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    rows={5}
                    className="mt-2 w-full border-0 border-b border-border bg-transparent py-2 text-base text-foreground outline-none focus:border-foreground"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="mt-10 inline-block border border-foreground bg-foreground px-8 py-4 text-xs font-medium uppercase tracking-widest text-background transition-colors hover:bg-transparent hover:text-foreground"
              >
                Send message
              </button>
            </>
          )}
        </form>
      </section>
    </>
  );
}

function Field({ label, name, type = "text" }: { label: string; name: string; type?: string }) {
  return (
    <div>
      <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required
        className="mt-2 w-full border-0 border-b border-border bg-transparent py-2 text-base text-foreground outline-none focus:border-foreground"
      />
    </div>
  );
}
