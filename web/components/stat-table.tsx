import Image from 'next/image';
import { useId, type ReactElement } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Badge, Badges, Cell, MessageCell, TableModel } from '@/lib/tables';

const RATE_DECIMALS = 3;

function MessageContent({ cell }: { cell: MessageCell }): ReactElement {
  if (cell.text === '' && cell.image === null) {
    return <span className="text-muted-foreground">Attachment</span>;
  }
  return (
    <div className="flex max-w-md flex-col gap-2 whitespace-normal wrap-anywhere">
      {cell.text === '' ? null : <span>{cell.text}</span>}
      {cell.image === null ? null : (
        <Image
          src={cell.image.src}
          width={cell.image.width}
          height={cell.image.height}
          alt={`Image sent by ${cell.sender}`}
          className="h-auto max-w-xs rounded-md"
          unoptimized
        />
      )}
    </div>
  );
}

function CellContent({ cell }: { cell: Cell }): ReactElement {
  if (typeof cell === 'object') {
    return <MessageContent cell={cell} />;
  }
  if (typeof cell === 'number' && !Number.isInteger(cell)) {
    return <>{cell.toFixed(RATE_DECIMALS)}</>;
  }
  return <>{cell}</>;
}

function badgeFor(
  badges: Badges | undefined,
  row: number,
  column: number,
  count: number,
): Badge | undefined {
  if (badges?.column !== column) {
    return undefined;
  }
  if (row === 0) {
    return badges.first;
  }
  return row === count - 1 ? badges.last : undefined;
}

function BadgeLabel({ badge }: { badge: Badge | undefined }): ReactElement | null {
  if (badge === undefined) {
    return null;
  }
  return (
    <span className={`ml-2 whitespace-nowrap text-xs font-semibold ${badge.className}`}>
      {badge.emoji} {badge.text}
    </span>
  );
}

function cellClass(cell: Cell, centered: boolean): string {
  if (centered) {
    return 'text-center';
  }
  return typeof cell === 'number' ? 'text-right tabular-nums' : 'text-left';
}

function headerLabel(header: string): string | undefined {
  return header === '#' ? 'Rank' : undefined;
}

function Rows({ model }: { model: TableModel }): ReactElement {
  return (
    <TableBody>
      {model.rows.map((row, index) => (
        <TableRow key={index}>
          {row.map((cell, column) => (
            <TableCell
              key={model.headers[column]}
              className={cellClass(cell, model.centered?.includes(column) === true)}
            >
              <CellContent cell={cell} />
              <BadgeLabel badge={badgeFor(model.badges, index, column, model.rows.length)} />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </TableBody>
  );
}

export function StatTable({ model }: { model: TableModel }): ReactElement {
  const titleId = useId();
  return (
    <div>
      <h3 id={titleId} className="font-sketch mb-3 text-2xl">
        {model.title}
      </h3>
      {model.rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing yet.</p>
      ) : (
        <Table aria-labelledby={titleId}>
          <TableHeader>
            <TableRow>
              {model.headers.map((header) => (
                <TableHead key={header} scope="col" aria-label={headerLabel(header)}>
                  {header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <Rows model={model} />
        </Table>
      )}
    </div>
  );
}
