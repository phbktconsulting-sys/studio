'use client';

import { useState } from 'react';
import * as XLSX from 'xlsx';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { DateRange } from 'react-date-range';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subWeeks,
  subMonths,
  subYears,
  format,
  isWithinInterval,
  parseISO
} from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import type { WorkItem, User } from '@/lib/types';
import { SlaInfo, calculateSla } from './sla-tracking-dashboard';
import { Download } from 'lucide-react';

interface SlaReportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  workItems: WorkItem[];
  usersMap: Map<string, string>;
}

type DateRangePreset = 'lastWeek' | 'lastMonth' | 'lastYear' | 'custom';

export function SlaReportDialog({
  isOpen,
  onClose,
  workItems,
  usersMap,
}: SlaReportDialogProps) {
  const { toast } = useToast();
  const [preset, setPreset] = useState<DateRangePreset>('lastWeek');
  const [customRange, setCustomRange] = useState([
    {
      startDate: new Date(),
      endDate: new Date(),
      key: 'selection',
    },
  ]);

  const handleDownload = () => {
    let startDate: Date;
    let endDate: Date;
    const now = new Date();

    if (preset === 'custom') {
      startDate = customRange[0].startDate;
      endDate = customRange[0].endDate;
    } else {
        switch (preset) {
            case 'lastWeek':
                startDate = startOfWeek(subWeeks(now, 1));
                endDate = endOfWeek(subWeeks(now, 1));
                break;
            case 'lastMonth':
                startDate = startOfMonth(subMonths(now, 1));
                endDate = endOfMonth(subMonths(now, 1));
                break;
            case 'lastYear':
                startDate = startOfYear(subYears(now, 1));
                endDate = endOfYear(subYears(now, 1));
                break;
            default:
                toast({
                    variant: 'destructive',
                    title: 'Invalid Date Range',
                    description: 'Please select a valid date range.',
                });
                return;
        }
    }
    
    // Ensure endDate includes the whole day
    endDate.setHours(23, 59, 59, 999);

    const filteredItems = workItems.filter((item) => {
        const createdAt = parseISO(item.createdAt);
        return isWithinInterval(createdAt, { start: startDate, end: endDate });
    });

    if (filteredItems.length === 0) {
      toast({
        title: 'No Data',
        description: 'No work items found for the selected date range.',
      });
      return;
    }

    try {
      const reportData = filteredItems.map((item) => {
        const slaInfo = calculateSla(item);
        return {
          'Case ID': item.customId,
          Process: item.process,
          Status: item.status,
          Urgency: item.urgency,
          'Assigned To': usersMap.get(item.assignedTo) || 'N/A',
          'Created At': format(parseISO(item.createdAt), 'yyyy-MM-dd HH:mm'),
          'Last Updated': format(parseISO(item.updatedAt), 'yyyy-MM-dd HH:mm'),
          'SLA Met': slaInfo.slaMet ? 'Yes' : 'No',
          'Days Open/Closed': slaInfo.days,
          'Customer Name': item.relatedContact.name,
          'Customer Email': item.relatedContact.email,
        };
      });

      const ws = XLSX.utils.json_to_sheet(reportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'SLA Report');
      const filename = `SLA_Report_${format(startDate, 'yyyy-MM-dd')}_to_${format(endDate, 'yyyy-MM-dd')}.xlsx`;
      XLSX.writeFile(wb, filename);

      toast({
        title: 'Report Downloaded',
        description: 'Your SLA report has been successfully generated and downloaded.',
      });
      onClose();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Download Failed',
        description: error.message || 'Could not generate the report.',
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Download SLA Report</DialogTitle>
          <DialogDescription>
            Select a date range for the report. The report will be downloaded
            as an Excel file.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <RadioGroup
            value={preset}
            onValueChange={(value) => setPreset(value as DateRangePreset)}
            className="flex flex-col space-y-1"
          >
            <div className="flex items-center space-x-3 space-y-0">
              <RadioGroupItem value="lastWeek" id="r1" />
              <Label htmlFor="r1">Last Week</Label>
            </div>
            <div className="flex items-center space-x-3 space-y-0">
              <RadioGroupItem value="lastMonth" id="r2" />
              <Label htmlFor="r2">Last Month</Label>
            </div>
            <div className="flex items-center space-x-3 space-y-0">
              <RadioGroupItem value="lastYear" id="r3" />
              <Label htmlFor="r3">Last Year</Label>
            </div>
             <div className="flex items-center space-x-3 space-y-0">
              <RadioGroupItem value="custom" id="r4" />
              <Label htmlFor="r4">Custom Range</Label>
            </div>
          </RadioGroup>
          
          {preset === 'custom' && (
            <div className="flex justify-center rounded-lg border">
                <DateRange
                    editableDateInputs={true}
                    onChange={(item) => setCustomRange([item.selection])}
                    moveRangeOnFirstSelection={false}
                    ranges={customRange}
                    className="w-full"
                />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
