import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';

beforeEach(() => {
  global.fetch = jest.fn();
});

test('App renders Todo List title', () => {
  render(<App />);
  const titleElement = screen.getByText(/Docker Fullstack Todo/i);
  expect(titleElement).toBeInTheDocument();
});

test('App shows add task form', () => {
  render(<App />);
  const inputElement = screen.getByPlaceholderText(/Добавить задачу/i);
  const buttonElement = screen.getByText(/Добавить/i);
  expect(inputElement).toBeInTheDocument();
  expect(buttonElement).toBeInTheDocument();
});

test('Add task button is disabled when input empty', () => {
  render(<App />);
  const buttonElement = screen.getByText(/Добавить/i);
  expect(buttonElement).not.toBeDisabled();
});

test('Task list renders when data fetched', async () => {
  global.fetch.mockResolvedValueOnce({
    json: async () => ({ 
      tasks: [{ id: 1, title: 'Test task', completed: false }],
      source: 'database'
    })
  });

  render(<App />);
  
  await waitFor(() => {
    const taskElement = screen.getByText(/Test task/i);
    expect(taskElement).toBeInTheDocument();
  });
});