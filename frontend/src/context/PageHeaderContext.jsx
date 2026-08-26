import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const PageHeaderContext = createContext(null);

export function PageHeaderProvider({ children }) {
  const [header, setHeader] = useState({ title: 'Dashboard', subtitle: '', actions: null });
  return <PageHeaderContext.Provider value={{ header, setHeader }}>{children}</PageHeaderContext.Provider>;
}

export function usePageHeader() {
  return useContext(PageHeaderContext).header;
}

// Call this inside a page component to set the topbar title/subtitle/actions,
// exactly like the original setPage(title, subtitle, actionsHtml) helper.
export function useSetPageHeader(title, subtitle, actions = null) {
  const { setHeader } = useContext(PageHeaderContext);
  useEffect(() => {
    setHeader({ title, subtitle, actions });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, subtitle, actions]);
}
