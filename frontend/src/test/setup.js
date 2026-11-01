import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => cleanup());

if (typeof window !== 'undefined' && !window.URL.createObjectURL) window.URL.createObjectURL = () => 'blob:mock';
if (typeof window !== 'undefined' && !window.URL.revokeObjectURL) window.URL.revokeObjectURL = () => {};
