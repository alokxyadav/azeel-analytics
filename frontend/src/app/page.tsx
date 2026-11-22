import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Hero, Features, Screenshots, Specifications, Privacy, Testimonials, Pricing, FAQ } from "@/components/landing/sections";
import { UploadDemo } from "@/components/landing/upload-demo";
import { Contact } from "@/components/landing/contact";

export default function Home() {
  return (
    <>
      <Navbar />
      <main id="main" className="flex-1">
        <Hero /><Features /><Screenshots /><UploadDemo /><Specifications /><Privacy /><Testimonials /><Pricing /><FAQ /><Contact />
      </main>
      <Footer />
    </>
  );
}
