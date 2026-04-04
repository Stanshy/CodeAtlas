/**
 * camera-presets component tests
 *
 * Tests the CameraPresets button rendering behaviour:
 * - Hidden in 2D mode (returns null)
 * - Renders 3 preset buttons in 3D mode
 * - Clicking a button dispatches SET_CAMERA_PRESET
 *
 * Sprint 4 — T9: Unit + Integration Tests
 */

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ViewStateProvider, useViewState } from '../src/contexts/ViewStateContext';
import { CameraPresets } from '../src/components/CameraPresets';

// Helper: renders CameraPresets after switching to 3D mode via a harness component
function renderIn3DMode() {
  function Harness() {
    const { dispatch } = useViewState();
    const [ready, setReady] = React.useState(false);

    React.useEffect(() => {
      dispatch({ type: 'SET_MODE', mode: '3d' });
      setReady(true);
    }, [dispatch]);

    if (!ready) return null;
    return React.createElement(CameraPresets);
  }

  return render(
    React.createElement(ViewStateProvider, null, React.createElement(Harness)),
  );
}

function renderIn2DMode() {
  return render(
    React.createElement(ViewStateProvider, null, React.createElement(CameraPresets)),
  );
}

describe('CameraPresets — 2D mode', () => {
  it('renders nothing in 2D mode', () => {
    const { container } = renderIn2DMode();
    expect(container.firstChild).toBeNull();
  });
});

describe('CameraPresets — 3D mode', () => {
  it('renders exactly 3 buttons', () => {
    renderIn3DMode();
    expect(screen.getAllByRole('button')).toHaveLength(3);
  });

  it('renders a button with text "Default"', () => {
    renderIn3DMode();
    const buttons = screen.getAllByRole('button');
    const labels = buttons.map((b) => b.textContent ?? '');
    expect(labels.some((l) => l.includes('Default'))).toBe(true);
  });

  it('renders a button with text "Top"', () => {
    renderIn3DMode();
    const buttons = screen.getAllByRole('button');
    const labels = buttons.map((b) => b.textContent ?? '');
    expect(labels.some((l) => l.includes('Top'))).toBe(true);
  });

  it('renders a button with text "Side"', () => {
    renderIn3DMode();
    const buttons = screen.getAllByRole('button');
    const labels = buttons.map((b) => b.textContent ?? '');
    expect(labels.some((l) => l.includes('Side'))).toBe(true);
  });

  it('each preset button has an aria-label attribute', () => {
    renderIn3DMode();
    const buttons = screen.getAllByRole('button');
    buttons.forEach((btn) => {
      expect(btn.getAttribute('aria-label')).not.toBeNull();
    });
  });
});

describe('CameraPresets — preset button click dispatches SET_CAMERA_PRESET', () => {
  it('clicking Default button dispatches SET_CAMERA_PRESET with default', () => {
    let capturedPreset: string | null | undefined;

    function Observer() {
      const { state } = useViewState();
      capturedPreset = state.cameraPreset;
      return null;
    }

    function Harness() {
      const { dispatch } = useViewState();
      const [ready, setReady] = React.useState(false);

      React.useEffect(() => {
        dispatch({ type: 'SET_MODE', mode: '3d' });
        setReady(true);
      }, [dispatch]);

      if (!ready) return null;
      return React.createElement(
        React.Fragment,
        null,
        React.createElement(CameraPresets),
        React.createElement(Observer),
      );
    }

    render(React.createElement(ViewStateProvider, null, React.createElement(Harness)));

    const defaultBtn = screen.getByLabelText('Camera preset: Default');
    fireEvent.click(defaultBtn);
    expect(capturedPreset).toBe('default');
  });

  it('clicking Top button dispatches SET_CAMERA_PRESET with topDown', () => {
    let capturedPreset: string | null | undefined;

    function Observer() {
      const { state } = useViewState();
      capturedPreset = state.cameraPreset;
      return null;
    }

    function Harness() {
      const { dispatch } = useViewState();
      const [ready, setReady] = React.useState(false);

      React.useEffect(() => {
        dispatch({ type: 'SET_MODE', mode: '3d' });
        setReady(true);
      }, [dispatch]);

      if (!ready) return null;
      return React.createElement(
        React.Fragment,
        null,
        React.createElement(CameraPresets),
        React.createElement(Observer),
      );
    }

    render(React.createElement(ViewStateProvider, null, React.createElement(Harness)));

    const topBtn = screen.getByLabelText('Camera preset: Top');
    fireEvent.click(topBtn);
    expect(capturedPreset).toBe('topDown');
  });

  it('clicking Side button dispatches SET_CAMERA_PRESET with sideView', () => {
    let capturedPreset: string | null | undefined;

    function Observer() {
      const { state } = useViewState();
      capturedPreset = state.cameraPreset;
      return null;
    }

    function Harness() {
      const { dispatch } = useViewState();
      const [ready, setReady] = React.useState(false);

      React.useEffect(() => {
        dispatch({ type: 'SET_MODE', mode: '3d' });
        setReady(true);
      }, [dispatch]);

      if (!ready) return null;
      return React.createElement(
        React.Fragment,
        null,
        React.createElement(CameraPresets),
        React.createElement(Observer),
      );
    }

    render(React.createElement(ViewStateProvider, null, React.createElement(Harness)));

    const sideBtn = screen.getByLabelText('Camera preset: Side');
    fireEvent.click(sideBtn);
    expect(capturedPreset).toBe('sideView');
  });
});
