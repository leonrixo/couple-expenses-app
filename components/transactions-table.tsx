"use client";

import { useState, useTransition } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { deleteTransaction } from "@/app/transactions/actions";

interface Row {
  id: string;
  date: string;
  concept: string;
  categoryName: string;
  amount: number;
  paidByName: string;
  splitType: string;
}

export function TransactionsTable({ rows }: { rows: Row[] }) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteTransaction(id);
      setPendingId(null);
    });
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Fecha</TableHead>
          <TableHead>Concepto</TableHead>
          <TableHead>Categoría</TableHead>
          <TableHead>Monto</TableHead>
          <TableHead>Quién pagó</TableHead>
          <TableHead>Reparto</TableHead>
          <TableHead>Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell>{row.date}</TableCell>
            <TableCell>{row.concept}</TableCell>
            <TableCell>{row.categoryName}</TableCell>
            <TableCell>${row.amount.toFixed(2)}</TableCell>
            <TableCell>{row.paidByName}</TableCell>
            <TableCell>{row.splitType}</TableCell>
            <TableCell className="flex gap-2">
              <a href={`/transactions/${row.id}/edit`} className="text-sm underline">
                Editar
              </a>
              <Dialog open={pendingId === row.id} onOpenChange={(open) => setPendingId(open ? row.id : null)}>
                <DialogTrigger render={<Button variant="destructive" size="sm" />}>
                  Borrar
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>¿Borrar este gasto?</DialogTitle>
                  </DialogHeader>
                  <p>&quot;{row.concept}&quot; — ${row.amount.toFixed(2)}. Esta acción no se puede deshacer.</p>
                  <DialogFooter>
                    <Button variant="destructive" disabled={isPending} onClick={() => handleDelete(row.id)}>
                      {isPending ? "Borrando..." : "Sí, borrar"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
