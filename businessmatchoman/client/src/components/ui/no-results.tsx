import React from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { EmptyIcon } from "@/components/icons";

interface NoResultsProps {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  actionOnClick?: () => void;
  icon?: React.ReactNode;
}

const NoResults: React.FC<NoResultsProps> = ({
  title,
  description,
  actionLabel,
  actionHref,
  actionOnClick,
  icon,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-gray-100 p-4 mb-4">
        {icon || <EmptyIcon className="h-12 w-12 text-gray-400" />}
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-500 max-w-sm mb-6">{description}</p>

      {actionLabel &&
        (actionHref ? (
          <Button asChild className="bg-orange-500 hover:bg-orange-600">
            <Link href={actionHref}>
              <a>{actionLabel}</a>
            </Link>
          </Button>
        ) : (
          <Button
            className="bg-orange-500 hover:bg-orange-600"
            onClick={actionOnClick}
          >
            {actionLabel}
          </Button>
        ))}
    </div>
  );
};

export default NoResults;
