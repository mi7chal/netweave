import { Button, useDisclosure } from "@heroui/react";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { AppLayout } from "../components/AppLayout";
import { ServiceGrid } from "../components/ServiceGrid";
import { AddServiceModal } from "../components/AddServiceModal";
import type { DashboardResponse } from "../types/api";

// This was the content of "App.tsx", now moved to a page component
export const Dashboard = () => {
    const [data, setData] = useState<DashboardResponse | null>(null);
    const { isOpen, onOpen, onOpenChange } = useDisclosure();

    const fetchData = async () => {
        try {
            const res = await fetch('/api/dashboard');
            if (res.ok) {
                const json = await res.json();
                setData(json);
            }
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 5000); // Refresh every 5s
        return () => clearInterval(interval);
    }, []);

    return (
        <AppLayout>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                    <p className="text-default-500">System Overview & Service Health</p>
                </div>
                <Button color="primary" variant="shadow" startContent={<Plus size={18} />} onPress={onOpen}>
                    Add Service
                </Button>
            </div>

            <ServiceGrid services={data?.services || []} />

            <AddServiceModal
                isOpen={isOpen}
                onOpenChange={onOpenChange}
                onServiceAdded={fetchData}
            />
        </AppLayout>
    );
}
