import { FC } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const AssessmentPeriods: FC = () => {
    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">Assessment Periods</h1>
                <p className="text-muted-foreground mt-2">
                    Manage assessment cycles, define periods, and track evaluation progress across the organization.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Assessment Management</CardTitle>
                    <CardDescription>Configure organizational review cycles</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center p-8 text-center bg-accent/20 rounded-lg">
                        <p className="text-muted-foreground mb-4">Assessment period management is currently under development.</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default AssessmentPeriods;
