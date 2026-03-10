import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FormInput } from '@/components/FormInput';

describe('FormInput', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('renders with label', () => {
    render(
      <FormInput label="Email" value="" onChange={() => {}} />,
      { wrapper }
    );
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('shows required indicator', () => {
    render(
      <FormInput label="Email" value="" onChange={() => {}} required />,
      { wrapper }
    );
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('validates email format', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <FormInput
        label="Email"
        value="invalid-email"
        onChange={onChange}
        pattern="email"
      />,
      { wrapper }
    );

    const input = screen.getByRole('textbox');
    await user.click(input);
    await user.tab(); // Trigger blur

    await waitFor(() => {
      expect(screen.getByText(/邮箱格式不正确/)).toBeInTheDocument();
    });
  });

  it('validates required field', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <FormInput
        label="Username"
        value=""
        onChange={onChange}
        required
      />,
      { wrapper }
    );

    const input = screen.getByRole('textbox');
    await user.click(input);
    await user.tab(); // Trigger blur

    await waitFor(() => {
      expect(screen.getByText(/不能为空/)).toBeInTheDocument();
    });
  });

  it('validates min length', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <FormInput
        label="Password"
        value="123"
        onChange={onChange}
        minLength={8}
      />,
      { wrapper }
    );

    const input = screen.getByRole('textbox');
    await user.click(input);
    await user.tab();

    await waitFor(() => {
      expect(screen.getByText(/至少需要 8 个字符/)).toBeInTheDocument();
    });
  });

  it('calls onChange when value changes', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <FormInput label="Name" value="" onChange={onChange} />,
      { wrapper }
    );

    const input = screen.getByRole('textbox');
    await user.type(input, 'John');

    expect(onChange).toHaveBeenCalledTimes(4); // Once per character
  });

  it('shows helper text when no error', () => {
    render(
      <FormInput
        label="Email"
        value=""
        onChange={() => {}}
        helperText="Enter your email address"
      />,
      { wrapper }
    );

    expect(screen.getByText('Enter your email address')).toBeInTheDocument();
  });

  it('disables input when disabled prop is true', () => {
    render(
      <FormInput label="Email" value="" onChange={() => {}} disabled />,
      { wrapper }
    );

    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
  });
});
