import { Pencil, Trash2, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CRUDTableProps {
  title: string;
  data: any[];
  columns: Array<{
    key: string;
    label: string;
    render?: (value: any) => React.ReactNode;
  }>;
  onAdd: () => void;
  onEdit: (item: any) => void;
  onDelete: (id: number) => void;
  isLoading?: boolean;
  error?: string;
}

export const CRUDTable: React.FC<CRUDTableProps> = ({
  title, data, columns, onAdd, onEdit, onDelete, isLoading = false, error,
}) => {
  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-6 px-4">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        <Button onClick={onAdd}><Plus className="mr-2 h-4 w-4" />Add New</Button>
      </div>
      {error && <Alert variant="destructive" className="mb-4"><AlertDescription>{error}</AlertDescription></Alert>}
      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              {columns.map((col) => (<TableHead key={col.key} className="font-semibold">{col.label}</TableHead>))}
              <TableHead className="text-center font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length > 0 ? data.map((item, index) => (
              <TableRow key={item.id || item.center_id || item.teacher_id || index} className="hover:bg-muted/30">
                {columns.map((col) => (<TableCell key={col.key}>{col.render ? col.render(item[col.key]) : item[col.key]}</TableCell>))}
                <TableCell className="text-center">
                  <TooltipProvider>
                    <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => onEdit(item)} className="text-primary"><Pencil className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Edit</TooltipContent></Tooltip>
                    <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => onDelete(item.id || item.center_id || item.teacher_id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Delete</TooltipContent></Tooltip>
                  </TooltipProvider>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow><TableCell colSpan={columns.length + 1} className="text-center py-8 text-muted-foreground">No data available</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

interface CRUDFormProps {
  title: string;
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  fields: Array<{ name: string; label: string; type?: 'text' | 'email' | 'tel' | 'date' | 'select'; required?: boolean; options?: Array<{ label: string; value: any }>; }>;
  data: any;
  setData: (data: any) => void;
  loading?: boolean;
}

export const CRUDForm: React.FC<CRUDFormProps> = ({ title, open, onClose, onSubmit, fields, data, setData, loading = false }) => {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-4">
          {fields.map((field) => (
            <div key={field.name} className="space-y-2">
              <Label htmlFor={field.name}>{field.label}</Label>
              {field.type === 'select' ? (
                <select id={field.name} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2" value={data[field.name] || ''} onChange={(e) => setData({ ...data, [field.name]: e.target.value })} required={field.required}>
                  <option value="">Select {field.label}</option>
                  {field.options?.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                </select>
              ) : (
                <Input id={field.name} type={field.type || 'text'} value={data[field.name] || ''} onChange={(e) => setData({ ...data, [field.name]: e.target.value })} required={field.required} />
              )}
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => { onSubmit(data); onClose(); }} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
