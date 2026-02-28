import { render, screen, fireEvent } from '@testing-library/react';
import { Accordion, AccordionPanel } from '@/components/shared/Accordion';

describe('Accordion', () => {
  it('renders panel titles', () => {
    render(
      <Accordion>
        <AccordionPanel id="a" title="Panel A">Content A</AccordionPanel>
        <AccordionPanel id="b" title="Panel B">Content B</AccordionPanel>
      </Accordion>,
    );
    expect(screen.getByText('Panel A')).toBeInTheDocument();
    expect(screen.getByText('Panel B')).toBeInTheDocument();
  });

  it('panels are closed by default', () => {
    render(
      <Accordion>
        <AccordionPanel id="a" title="Panel A">Content A</AccordionPanel>
      </Accordion>,
    );
    expect(screen.queryByText('Content A')).not.toBeInTheDocument();
  });

  it('opens default panel', () => {
    render(
      <Accordion defaultOpen="a">
        <AccordionPanel id="a" title="Panel A">Content A</AccordionPanel>
        <AccordionPanel id="b" title="Panel B">Content B</AccordionPanel>
      </Accordion>,
    );
    expect(screen.getByText('Content A')).toBeInTheDocument();
    expect(screen.queryByText('Content B')).not.toBeInTheDocument();
  });

  it('toggles panel on click', () => {
    render(
      <Accordion>
        <AccordionPanel id="a" title="Panel A">Content A</AccordionPanel>
      </Accordion>,
    );
    fireEvent.click(screen.getByText('Panel A'));
    expect(screen.getByText('Content A')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Panel A'));
    expect(screen.queryByText('Content A')).not.toBeInTheDocument();
  });

  it('single mode closes other panels', () => {
    render(
      <Accordion defaultOpen="a">
        <AccordionPanel id="a" title="Panel A">Content A</AccordionPanel>
        <AccordionPanel id="b" title="Panel B">Content B</AccordionPanel>
      </Accordion>,
    );
    expect(screen.getByText('Content A')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Panel B'));
    expect(screen.getByText('Content B')).toBeInTheDocument();
    expect(screen.queryByText('Content A')).not.toBeInTheDocument();
  });

  it('multi mode allows multiple open panels', () => {
    render(
      <Accordion allowMultiple defaultOpen="a">
        <AccordionPanel id="a" title="Panel A">Content A</AccordionPanel>
        <AccordionPanel id="b" title="Panel B">Content B</AccordionPanel>
      </Accordion>,
    );
    fireEvent.click(screen.getByText('Panel B'));
    expect(screen.getByText('Content A')).toBeInTheDocument();
    expect(screen.getByText('Content B')).toBeInTheDocument();
  });
});
