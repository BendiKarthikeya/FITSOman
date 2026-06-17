import React from 'react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card';
import { Checkbox } from '../components/Checkbox';
import { Badge } from '../components/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/Table';
import { MetricCard } from '../components/MetricCard';
import { Smile, FileCheck, Activity } from 'lucide-react';

export const ComponentShowcase: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Insight Pulse UI Components</h1>
          <p className="text-lg text-slate-600">Component library for the survey management platform</p>
        </div>

        {/* Buttons */}
        <Card>
          <CardHeader>
            <CardTitle>Buttons</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {/* Primary Buttons */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-4">Primary Buttons</h3>
                <div className="flex flex-wrap gap-4">
                  <Button variant="primary" size="sm">
                    Small
                  </Button>
                  <Button variant="primary" size="md">
                    Medium
                  </Button>
                  <Button variant="primary" size="lg">
                    Large
                  </Button>
                  <Button variant="primary" disabled>
                    Disabled
                  </Button>
                </div>
              </div>

              {/* Secondary Buttons */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-4">Secondary Buttons</h3>
                <div className="flex flex-wrap gap-4">
                  <Button variant="secondary" size="sm">
                    Small
                  </Button>
                  <Button variant="secondary" size="md">
                    Medium
                  </Button>
                  <Button variant="secondary" size="lg">
                    Large
                  </Button>
                </div>
              </div>

              {/* Outline Buttons */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-4">Outline Buttons</h3>
                <div className="flex flex-wrap gap-4">
                  <Button variant="outline" size="sm">
                    Small
                  </Button>
                  <Button variant="outline" size="md">
                    Medium
                  </Button>
                  <Button variant="outline" size="lg">
                    Large
                  </Button>
                </div>
              </div>

              {/* Ghost Buttons */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-4">Ghost Buttons</h3>
                <div className="flex flex-wrap gap-4">
                  <Button variant="ghost" size="sm">
                    Small
                  </Button>
                  <Button variant="ghost" size="md">
                    Medium
                  </Button>
                  <Button variant="ghost" size="lg">
                    Large
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form Elements */}
        <Card>
          <CardHeader>
            <CardTitle>Form Elements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <Input label="Email Address" type="email" placeholder="user@example.com" />
            <Input label="Password" type="password" placeholder="••••••••" />
            <Input
              label="With Error"
              type="text"
              placeholder="This field has an error"
              error="This field is required"
            />
            <Input
              label="With Helper Text"
              type="text"
              placeholder="With helper text"
              helperText="This is a helpful hint"
            />

            <div className="pt-4 border-t border-slate-200">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">Checkboxes</h3>
              <div className="space-y-3">
                <Checkbox label="I agree to the terms and conditions" />
                <Checkbox label="Remember me" />
                <Checkbox label="Disabled checkbox" disabled />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Badges */}
        <Card>
          <CardHeader>
            <CardTitle>Badges</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Badge variant="default">Default</Badge>
              <Badge variant="success">Success</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="error">Error</Badge>
              <Badge variant="info">Info</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Metric Cards */}
        <Card>
          <CardHeader>
            <CardTitle>Metric Cards</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MetricCard
                title="Engagement Score"
                value="78/100"
                icon={<Smile className="w-5 h-5" />}
                trend={{ value: 12.5, direction: 'up' }}
                period="Last 6 Months"
              />
              <MetricCard
                title="Response Rate"
                value="62%"
                icon={<FileCheck className="w-5 h-5" />}
                trend={{ value: 3.5, direction: 'down' }}
                period="Last 6 Months"
              />
              <MetricCard
                title="Active Surveys"
                value="12"
                icon={<Activity className="w-5 h-5" />}
                trend={{ value: 0, direction: 'up' }}
                period="Current"
              />
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>Data Table</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Survey Name</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Response Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Cover page</TableCell>
                  <TableCell>
                    <Badge variant="default">Web</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="warning">In Review</Badge>
                  </TableCell>
                  <TableCell>5/12/2026</TableCell>
                  <TableCell>8</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Table of contents</TableCell>
                  <TableCell>
                    <Badge variant="default">Mobile</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="success">Completed</Badge>
                  </TableCell>
                  <TableCell>24/7/2026</TableCell>
                  <TableCell>29</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Executive summary</TableCell>
                  <TableCell>
                    <Badge variant="default">Voice</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="error">Flagged</Badge>
                  </TableCell>
                  <TableCell>13/04/2026</TableCell>
                  <TableCell>-10</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Cards */}
        <Card>
          <CardHeader>
            <CardTitle>Cards</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-gradient-to-br from-blue-50 to-indigo-50">
                <CardContent className="pt-6">
                  <h3 className="text-sm font-semibold text-slate-900 mb-2">Feature Card</h3>
                  <p className="text-sm text-slate-600">Customize card styling with background gradients and content</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl font-bold text-slate-900 mb-2">42</div>
                  <p className="text-sm text-slate-600">Total Surveys</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-slate-600">Cards can be used to group related content and create visual separation in layouts</p>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
