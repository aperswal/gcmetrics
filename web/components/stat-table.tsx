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
  const byline = (
    <span className="text-xs text-muted-foreground sm:hidden">
      {cell.sender}, {cell.date}
    </span>
  );
  if (cell.text === '' && cell.image === null) {
    return (
      <div className="flex flex-col gap-1">
        {byline}
        <span className="text-muted-foreground">Attachment</span>
      </div>
    );
  }
  return (
    <div className="flex max-w-md flex-col gap-2 whitespace-normal wrap-anywhere">
      {byline}
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

function cellClass(cell: Cell, centered: boolean, hidden: boolean): string {
  const visibility = hidden ? 'hidden sm:table-cell ' : '';
  if (centered) {
    return `${visibility}text-center`;
  }
  return `${visibility}${typeof cell === 'number' ? 'text-right tabular-nums' : 'text-left'}`;
}

function isHidden(model: TableModel, column: number): boolean {
  return model.hiddenOnMobile?.includes(column) === true;
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
              className={cellClass(
                cell,
                model.centered?.includes(column) === true,
                isHidden(model, column),
              )}
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
              {model.headers.map((header, column) => (
                <TableHead
                  key={header}
                  scope="col"
                  aria-label={headerLabel(header)}
                  className={isHidden(model, column) ? 'hidden sm:table-cell' : undefined}
                >
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
