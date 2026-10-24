import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SidePanelProvider, useSidePanel } from '@/components/SidePanel';

let mockPathname = '/settings';

jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}));

/** A panel that seeds its form state from props, like PlaceInfoPanel. */
function NameForm({ initialName }: { initialName: string }) {
  const [name, setName] = useState(initialName);
  return <input aria-label="Name" value={name} onChange={(e) => setName(e.target.value)} />;
}

function Opener() {
  const { openRight, openLeft, closeRight } = useSidePanel();
  return (
    <>
      <button onClick={() => openRight(<NameForm initialName="Home" />)}>Edit Home</button>
      <button onClick={() => openRight(<NameForm initialName="Lake House" />)}>Edit Lake House</button>
      <button onClick={() => openLeft(<NameForm initialName="Left Home" />)}>Left Home</button>
      <button onClick={() => openLeft(<NameForm initialName="Left Lake" />)}>Left Lake</button>
      <button onClick={closeRight}>Close</button>
    </>
  );
}

function renderPanels() {
  return render(
    <SidePanelProvider>
      <Opener />
    </SidePanelProvider>,
  );
}

beforeEach(() => {
  mockPathname = '/settings';
});

describe('SidePanel', () => {
  it('matches snapshot with the right panel open', () => {
    const { container } = renderPanels();
    fireEvent.click(screen.getByText('Edit Home'));
    expect(container).toMatchSnapshot();
  });

  it('renders the opened content in the right panel', () => {
    renderPanels();
    fireEvent.click(screen.getByText('Edit Home'));
    expect(screen.getByTestId('side-panel-right')).toContainElement(screen.getByLabelText('Name'));
    expect(screen.getByLabelText('Name')).toHaveValue('Home');
  });

  it('mounts fresh content when a panel of the same type is opened over another', () => {
    renderPanels();
    fireEvent.click(screen.getByText('Edit Home'));
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Home (edited)' } });

    fireEvent.click(screen.getByText('Edit Lake House'));

    expect(screen.getByLabelText('Name')).toHaveValue('Lake House');
  });

  it('mounts fresh content when the same panel is reopened while open', () => {
    renderPanels();
    fireEvent.click(screen.getByText('Edit Home'));
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'typed' } });

    fireEvent.click(screen.getByText('Edit Home'));

    expect(screen.getByLabelText('Name')).toHaveValue('Home');
  });

  it('mounts fresh content in the left panel too', () => {
    renderPanels();
    fireEvent.click(screen.getByText('Left Home'));
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'typed' } });

    fireEvent.click(screen.getByText('Left Lake'));

    expect(screen.getByLabelText('Name')).toHaveValue('Left Lake');
  });

  it('removes the content when closed', () => {
    renderPanels();
    fireEvent.click(screen.getByText('Edit Home'));
    fireEvent.click(screen.getByText('Close'));
    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument();
  });
});
