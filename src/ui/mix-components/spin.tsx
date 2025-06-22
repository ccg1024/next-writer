import { Spin } from 'antd';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

class GlobalSpin {
  static setLoading: (loading: boolean) => void;
  private isMount: boolean;

  constructor() {
    this.isMount = false;

    this.mount = this.mount.bind(this);
    this.loading = this.loading.bind(this);
    this.Component = this.Component.bind(this);
  }

  mount() {
    if (this.isMount) {
      console.warn('The GlobalSpin has already mounted.');
      return;
    }
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      height: 100%;
      width: 100%;
      z-index: 1000;
    `;
    document.body.appendChild(wrapper);
    const root = createRoot(wrapper);
    const Com = this.Component;
    root.render(<Com />);
    this.isMount = true;
  }

  loading(load: boolean) {
    if (!this.isMount) {
      console.warn('The GlobalSpin is not mount yet.');
      return;
    }
    GlobalSpin.setLoading(load);
  }

  Component() {
    const [loading, setLoading] = useState(false);
    const spinRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      GlobalSpin.setLoading = setLoading;
      return () => {
        GlobalSpin.setLoading = null;
      };
    }, []);

    useLayoutEffect(() => {
      const parent = spinRef.current.parentElement;
      if (loading) {
        if (parent) {
          parent.style.display = 'block';
        }
      } else {
        if (parent) {
          parent.style.display = 'none';
        }
      }
    }, [loading]);

    return (
      <>
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            background: 'rgba(0,0,0,0.25)',
            height: '100%',
            width: '100%'
          }}
        ></div>
        <div ref={spinRef} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <Spin delay={500} spinning={loading} style={{}} />
        </div>
      </>
    );
  }
}

export const globalSpin = new GlobalSpin();

export const nwSpin = {
  loading: globalSpin.loading
};
