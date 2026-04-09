/**
 * camera-presets component tests
 *
 * Tests the CameraPresets component rendering behaviour.
 * Note: 3D mode was removed in Sprint 19 T12. CameraPresets is now a no-op
 * placeholder that always returns null. Only the 2D mode (null render) tests remain.
 *
 * Sprint 4 — T9: Unit + Integration Tests
 * Sprint 19 — T12: 3D removal — 3D mode tests removed
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
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

// Sprint 19 T12: 3D has been removed. CameraPresets is now a no-op placeholder that returns null.
// All 3D mode rendering and click tests removed — the component renders nothing regardless of mode.
describe('CameraPresets — 3D mode (removed in Sprint 19 T12)', () => {
  it('renders nothing in 3D mode (3D removed, component is no-op)', () => {
    const { container } = renderIn3DMode();
    expect(container.firstChild).toBeNull();
  });
});
