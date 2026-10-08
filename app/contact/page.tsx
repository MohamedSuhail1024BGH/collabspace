import type { Metadata } from "next";
import { ContactClient } from "@/components/contact/ContactClient";

export const metadata: Metadata = {
  title: "Contact Us & Support",
  description:
    "Reach out to CollabSpace support, enterprise sales, or security team. Official contact emails, headquarters address, and support desk.",
};

export default function ContactPage() {
  return <ContactClient />;
}
