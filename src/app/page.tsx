import Image from "next/image";
import { QuoteForm } from "@/components/QuoteForm";
import { config } from "@/lib/config";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[760px] flex-col justify-center px-5 py-10 sm:px-8 sm:py-14">
      <header className="mb-7 text-center">
        <div className="relative mx-auto mb-5 h-[100px] w-[250px] sm:h-[124px] sm:w-[310px]">
          <Image
            src="/logo-transparent.png"
            alt={config.appName}
            fill
            className="object-contain"
            sizes="310px"
            priority
          />
        </div>
        <p className="text-[0.75rem] font-bold uppercase tracking-[0.18em] text-[var(--brand)]">
          Free on-site quote
        </p>
        <h1 className="mt-3 text-[clamp(1.7rem,6vw,2.35rem)] font-extrabold leading-[1.1] tracking-[-0.03em] text-[var(--ink)]">
          Book your free pool cleaning quote
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-[1.02rem] text-[var(--ink-muted)]">
          We will come out and provide a clear monthly quote for your pool cleaning.
        </p>
      </header>

      <QuoteForm />

      <p className="mt-6 text-center text-sm text-[var(--ink-muted)]">
        Prefer to talk?{" "}
        <a
          href={`tel:${config.phone.replace(/\D/g, "")}`}
          className="font-semibold text-[var(--brand-deep)]"
        >
          {config.phone}
        </a>
      </p>
    </main>
  );
}
