import { useEffect, useRef, useState } from "react";
import { useFetcher } from "react-router";
import type { ProductSearchResult } from "../product-tags.server";
import { interpolate } from "../i18n/format";

export interface TaggedProduct {
  id: string;
  productId: string;
  productHandle: string;
  title: string;
  price: string;
  currencyCode: string;
  imageUrl: string | null;
}

export interface ProductTaggerDictionary {
  [key: string]: string;
  tagProductsButton: string;
  tagProductsButtonWithCount: string;
  tagProductsAriaDisabled: string;
  tagProductsAria: string;
  upgradeHeading: string;
  upgradeBody: string;
  removeProductAria: string;
  searchLabel: string;
  searchPlaceholder: string;
  addProductAria: string;
}

export default function ProductTagger({
  tags,
  open,
  onToggleOpen,
  onTag,
  onUntag,
  disabled,
  t,
}: {
  tags: TaggedProduct[];
  open: boolean;
  onToggleOpen: () => void;
  onTag: (product: ProductSearchResult) => void;
  onUntag: (tagId: string) => void;
  disabled?: boolean;
  t: ProductTaggerDictionary;
}) {
  const searchFetcher = useFetcher<{ products: ProductSearchResult[] }>();
  const [query, setQuery] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;
    searchFetcher.load(`/app/product-search?q=${encodeURIComponent(query)}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const runSearch = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      searchFetcher.load(`/app/product-search?q=${encodeURIComponent(value)}`);
    }, 350);
  };

  const taggedIds = new Set(tags.map((tag) => tag.productId));
  const results = searchFetcher.data?.products ?? [];

  return (
    <s-stack direction="block" gap="small-100">
      <s-button
        variant="tertiary"
        icon="product"
        accessibilityLabel={disabled ? t.tagProductsAriaDisabled : t.tagProductsAria}
        onClick={onToggleOpen}
      >
        {tags.length > 0
          ? interpolate(t.tagProductsButtonWithCount, { count: tags.length })
          : t.tagProductsButton}
      </s-button>

      {disabled && open && (
        <s-banner tone="warning" heading={t.upgradeHeading}>
          {t.upgradeBody}
        </s-banner>
      )}

      {!disabled && open && (
        <s-stack direction="block" gap="small-100">
          {tags.length > 0 && (
            <s-stack direction="block" gap="small-100">
              {tags.map((tag) => (
                <div
                  key={tag.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    border: "1px solid #e3e4e6",
                    borderRadius: 8,
                    padding: "6px 8px",
                  }}
                >
                  {tag.imageUrl && (
                    <img
                      src={tag.imageUrl}
                      alt=""
                      style={{ width: 28, height: 28, borderRadius: 4, objectFit: "cover" }}
                    />
                  )}
                  <s-text type="strong">{tag.title}</s-text>
                  <div style={{ flex: 1 }}></div>
                  <s-button
                    variant="tertiary"
                    tone="critical"
                    icon="x-circle"
                    accessibilityLabel={t.removeProductAria}
                    onClick={() => onUntag(tag.id)}
                  ></s-button>
                </div>
              ))}
            </s-stack>
          )}

          <s-text-field
            label={t.searchLabel}
            labelAccessibilityVisibility="exclusive"
            placeholder={t.searchPlaceholder}
            value={query}
            onChange={(event) => runSearch(event.currentTarget.value)}
          ></s-text-field>

          <s-stack direction="block" gap="small-100">
            {results
              .filter((product) => !taggedIds.has(product.id))
              .slice(0, 8)
              .map((product) => (
                <div
                  key={product.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "4px 0",
                  }}
                >
                  {product.imageUrl && (
                    <img
                      src={product.imageUrl}
                      alt=""
                      style={{ width: 28, height: 28, borderRadius: 4, objectFit: "cover" }}
                    />
                  )}
                  <s-text>{product.title}</s-text>
                  <div style={{ flex: 1 }}></div>
                  <s-button
                    variant="tertiary"
                    icon="plus-circle"
                    accessibilityLabel={t.addProductAria}
                    onClick={() => onTag(product)}
                  ></s-button>
                </div>
              ))}
          </s-stack>
        </s-stack>
      )}
    </s-stack>
  );
}
