'use client';

import { useState } from 'react';
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from './ui/separator';
import { CustomCalendar } from './custom-calendar';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import type { User } from '@/lib/types';


type ActionType =
  | 'resolve-complete'
  | 're-index'
  | 'terminate'
  | 'resolve-close'
  | 'transfer'
  | 'pend';

export function VerifyAuthorityDialog() {
  const { firestore } = useFirebase();
  const [selectedAction, setSelectedAction] = useState<ActionType | ''>('');
  
  const usersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'users'));
  }, [firestore]);

  const { data: users } = useCollection<User>(usersQuery);

  const renderActionForm = () => {
    switch (selectedAction) {
      case 'resolve-complete':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Call to customer?</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes-resolve-complete">Notes</Label>
              <Textarea id="notes-resolve-complete" placeholder="Add notes..." />
            </div>
          </div>
        );
      case 're-index':
        return (
          <div className="space-y-4">
             <div className="space-y-2">
              <Label>Please select the correct Re-index option</Label>
              <RadioGroup defaultValue="myself">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="myself" id="reindex-myself" />
                  <Label htmlFor="reindex-myself">Re-index case myself</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="initial" id="reindex-initial" />
                  <Label htmlFor="reindex-initial">Return to initial Indexing</Label>
                </div>
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select reason..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="wrong-process">Wrong Process</SelectItem>
                  <SelectItem value="incorrect-data">Incorrect Data</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
                <Label>Do you want to copy the notes to the new case?</Label>
                 <RadioGroup defaultValue="yes">
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="yes" id="copy-yes" />
                        <Label htmlFor="copy-yes">Yes</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="no" id="copy-no" />
                        <Label htmlFor="copy-no">No</Label>
                    </div>
                </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes-re-index">Note</Label>
              <Textarea id="notes-re-index" placeholder="Add notes..." />
            </div>
          </div>
        );
      case 'terminate':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Reason</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select reason..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer-request">Customer Request</SelectItem>
                  <SelectItem value="fraud">Potential Fraud</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes-terminate">Notes</Label>
              <Textarea id="notes-terminate" placeholder="Add notes..." />
            </div>
          </div>
        );
      case 'resolve-close':
         return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Customer request resolved?</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes-resolve-close">Notes</Label>
              <Textarea id="notes-resolve-close" placeholder="Add notes..." />
            </div>
          </div>
        );
      case 'transfer':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Transfer to User</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select user..." />
                </SelectTrigger>
                <SelectContent>
                   {users?.map(user => (
                    <SelectItem key={user.uid} value={user.uid}>{user.displayName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes-transfer">Notes</Label>
              <Textarea id="notes-transfer" placeholder="Add notes..." />
            </div>
          </div>
        );
      case 'pend':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
                <Label>Pend until date</Label>
                <CustomCalendar onChange={() => {}} />
            </div>
            <div className="space-y-2">
              <Label>Reason for pend</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select reason..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info-needed">Information Needed</SelectItem>
                  <SelectItem value="customer-unavailable">Customer Unavailable</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes-pend">Notes</Label>
              <Textarea id="notes-pend" placeholder="Add notes..." />
            </div>
          </div>
        );
      default:
        return <p className='text-center text-muted-foreground'>Please select an action to continue.</p>;
    }
  };

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Verify Customer Authority - Action</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label>Action</Label>
          <Select onValueChange={(value) => setSelectedAction(value as ActionType)}>
            <SelectTrigger>
              <SelectValue placeholder="--Select a different action--" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="resolve-complete">Resolve Complete</SelectItem>
              <SelectItem value="re-index">Re-Index</SelectItem>
              <SelectItem value="terminate">Terminate</SelectItem>
              <SelectItem value="resolve-close">Resolve Close</SelectItem>
              <SelectItem value="transfer">Transfer to Another User</SelectItem>
              <SelectItem value="pend">Pend Work</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {selectedAction && <Separator className='my-4' />}

        {renderActionForm()}
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="secondary">
            Cancel
          </Button>
        </DialogClose>
        <Button type="submit" disabled={!selectedAction}>Submit</Button>
      </DialogFooter>
    </DialogContent>
  );
}
