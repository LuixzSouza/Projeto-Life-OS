import { redirect } from "next/navigation";
import { isSystemInstalled } from "@/lib/db-config";
import RegisterPageClient from "@/components/login/RegisterPageClient";

export default async function RegisterPage() {
    // O cadastro só existe num sistema já configurado. Sem instalação, a primeira
    // conta é criada no /setup (que também define o banco).
    if (!isSystemInstalled()) {
        redirect("/setup");
    }
    return <RegisterPageClient />;
}
