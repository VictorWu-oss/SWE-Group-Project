import React from 'react';
import { render, screen, userEvent } from '@testing-library/react-native';
import { MaintenanceReportsSection } from '../src/rating/MaintenanceReportsSection';
import { fetchMaintenanceReports, submitMaintenanceReport } from '../src/main/api';

jest.mock('../src/main/api', () => ({
  fetchMaintenanceReports: jest.fn(),
  submitMaintenanceReport: jest.fn(),
}));

const fetchReportsMock = jest.mocked(fetchMaintenanceReports);
const submitReportMock = jest.mocked(submitMaintenanceReport);

const savedReport = {
  id: 21,
  bathroomId: 'bathroom-1',
  category: 'supplies' as const,
  description: 'Paper towels are out.',
  status: 'open' as const,
  createdAt: '2026-11-20T20:00:00.000Z',
  updatedAt: '2026-11-20T20:00:00.000Z',
};

async function renderMaintenanceReports() {
  await render(
    <MaintenanceReportsSection bathroomId="bathroom-1" installationId="installation-12345678" />,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  fetchReportsMock.mockResolvedValue([]);
});

test('student submits a maintenance issue and sees confirmation and the new report', async () => {
  const user = userEvent.setup();
  submitReportMock.mockResolvedValue(savedReport);
  await renderMaintenanceReports();

  expect(await screen.findByText('No maintenance reports yet.')).toBeTruthy();

  await user.press(screen.getByText('supplies'));
  await user.type(
    screen.getByLabelText('Maintenance issue description'),
    'Paper towels are out.',
  );

  expect(screen.getByRole('button', {
    name: 'Submit maintenance report',
    disabled: false,
  })).toBeTruthy();
  const submitButton = screen.getByRole('button', { name: 'Submit maintenance report' });
  await user.press(submitButton);

  expect(await screen.findByText(
    'Maintenance report submitted. It is not yet verified by staff.',
  )).toBeTruthy();
  expect(screen.getByText('supplies: Paper towels are out.')).toBeTruthy();
  expect(screen.getByText(/^Submitted \|/)).toBeTruthy();
  expect(submitReportMock).toHaveBeenCalledWith(
    'bathroom-1',
    'installation-12345678',
    'supplies',
    'Paper towels are out.',
  );
});

test('student cannot submit a short description and sees recoverable API failure', async () => {
  const user = userEvent.setup();
  submitReportMock.mockRejectedValue(new Error('Service is unavailable.'));
  await renderMaintenanceReports();

  await user.press(screen.getByText('fixture'));
  const descriptionInput = screen.getByLabelText('Maintenance issue description');
  await user.type(
    descriptionInput,
    'sink',
  );

  expect(screen.getByRole('button', {
    name: 'Submit maintenance report',
    disabled: true,
  })).toBeTruthy();
  const submitButton = screen.getByRole('button', { name: 'Submit maintenance report' });
  await user.press(submitButton);
  expect(submitReportMock).not.toHaveBeenCalled();

  await user.clear(descriptionInput);
  await user.type(descriptionInput, 'The sink is leaking.');
  await user.press(submitButton);

  expect(await screen.findByText('Service is unavailable.')).toBeTruthy();
  expect(screen.queryByText('Maintenance report submitted. It is not yet verified by staff.'))
    .toBeNull();
  expect(screen.getByText('No maintenance reports yet.')).toBeTruthy();
  expect(submitReportMock).toHaveBeenCalledTimes(1);
});
