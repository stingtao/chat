'use client';

/* eslint-disable @next/next/no-img-element */
/* eslint-disable jsx-a11y/alt-text */

import type { ComponentPropsWithoutRef } from 'react';

type ClientImageProps = ComponentPropsWithoutRef<'img'> & {
  alt: string;
  priority?: boolean;
};

export default function ClientImage({
  alt,
  loading,
  decoding,
  priority = false,
  ...props
}: ClientImageProps) {
  return (
    <img
      {...props}
      alt={alt}
      loading={priority ? 'eager' : loading || 'lazy'}
      decoding={decoding || 'async'}
    />
  );
}
