import { Card, CardHeader, CardBody, Divider, Chip, Link } from "@heroui/react";
import type { Service } from "../types/api";

interface ServiceGridProps {
    services: Service[];
}

export const ServiceGrid = ({ services }: ServiceGridProps) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) => (
                <Card key={service.id} className="p-4 hover:scale-[1.02] transition-transform">
                    <CardHeader className="flex justify-between items-start pb-2">
                        <div className="flex gap-3 items-center">
                            <div className={`w-3 h-3 rounded-full ${getStatusColor(service.status)} ${service.status === 'UP' ? 'animate-pulse' : ''}`}></div>
                            <div className="flex flex-col">
                                <p className="text-lg font-bold">{service.name}</p>
                                <Link isExternal href={service.base_url} size="sm" className="text-default-400">
                                    {new URL(service.base_url).hostname}
                                </Link>
                            </div>
                        </div>
                        <Chip size="sm" variant="flat" color={getChipColor(service.status)}>
                            {service.status}
                        </Chip>
                    </CardHeader>
                    {service.health_endpoint && (
                        <>
                            <Divider className="my-2" />
                            <CardBody className="py-2">
                                <p className="text-xs text-default-400">
                                    Last Check: {service.last_check ? new Date(service.last_check).toLocaleTimeString() : 'Never'}
                                </p>
                            </CardBody>
                        </>
                    )}
                </Card>
            ))}
        </div>
    );
};

function getStatusColor(status: string) {
    switch (status) {
        case 'UP': return 'bg-success';
        case 'DOWN': return 'bg-danger';
        case 'MAINTENANCE': return 'bg-warning';
        default: return 'bg-default-400';
    }
}

function getChipColor(status: string) {
    switch (status) {
        case 'UP': return 'success';
        case 'DOWN': return 'danger';
        case 'MAINTENANCE': return 'warning';
        default: return 'default';
    }
}
