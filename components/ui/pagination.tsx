import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
}: PaginationProps) {
  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  // Вычисляем диапазон страниц для отображения
  const getPageNumbers = (): number[] => {
    if (totalPages <= 5) {
      // Если страниц 5 или меньше, показываем все
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    if (currentPage <= 3) {
      // В начале: показываем первые 5 страниц
      return [1, 2, 3, 4, 5];
    }

    if (currentPage >= totalPages - 2) {
      // В конце: показываем последние 5 страниц
      return [
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ];
    }

    // В середине: текущая страница посередине (на 3 позиции)
    return [
      currentPage - 2,
      currentPage - 1,
      currentPage,
      currentPage + 1,
      currentPage + 2,
    ];
  };

  const handleFirst = () => {
    if (currentPage > 1) {
      onPageChange(1);
    }
  };

  const handleLast = () => {
    if (currentPage < totalPages) {
      onPageChange(totalPages);
    }
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Button
        variant="outline"
        size="sm"
        onClick={handleFirst}
        disabled={currentPage === 1}
        className="h-8 w-8 p-0"
        title="Первая страница"
      >
        <ChevronsLeft className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handlePrevious}
        disabled={currentPage === 1}
        className="h-8 w-8 p-0"
        title="Предыдущая страница"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {pageNumbers.map((pageNum) => (
        <Button
          key={pageNum}
          variant={currentPage === pageNum ? 'default' : 'outline'}
          size="sm"
          onClick={() => onPageChange(pageNum)}
          className={cn(
            'h-8 w-8 p-0',
            currentPage === pageNum && 'bg-primary text-primary-foreground',
          )}
        >
          {pageNum}
        </Button>
      ))}

      <Button
        variant="outline"
        size="sm"
        onClick={handleNext}
        disabled={currentPage === totalPages || totalPages === 0}
        className="h-8 w-8 p-0"
        title="Следующая страница"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleLast}
        disabled={currentPage === totalPages || totalPages === 0}
        className="h-8 w-8 p-0"
        title="Последняя страница"
      >
        <ChevronsRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
