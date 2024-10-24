/* eslint-disable @typescript-eslint/no-explicit-any */
import '@girs/gjs';
import '@girs/gjs/dom';
import '@girs/gnome-shell/ambient';
import '@girs/gnome-shell/extensions/global';

declare module 'resource:///org/gnome/shell/ui/popupMenu.js' {
  import St from 'gi://St';
  import Clutter from 'gi://Clutter';

  class PopupMenuManager {
    constructor(owner: Clutter.Actor, grab_params?: object);
    ignoreRelease(): void;
    addMenu(actor: PopupMenu, position?: number): void;
  }

  class PopupMenu {
    actor: St.Widget;
    constructor(
      source_actor: Clutter.Actor,
      arrow_alignment: number,
      arrow_side: St.Side
    );
    destroy(): void;
    open(): void;
    close(): void;
  }
}

declare module 'resource:///org/gnome/shell/ui/panelMenu.js' {
  import St from 'gi://St';
  class ButtonBox extends St.Widget {
    container: St.Bin;
  }
  class Button extends ButtonBox {
    menu: any;
  }
}

declare module 'gi://Gio' {
  class FileInputStream {
    get_fd(): number;
  }
}

declare module 'resource:///org/gnome/shell/ui/panel.js' {
  import St from 'gi://St';

  import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
  import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';

  class Panel extends St.Widget {
    statusArea: { [key: string]: PanelMenu.Button };
    addToStatusArea(
      role: string,
      indicator: PanelMenu.Button,
      position: number,
      box: 'left' | 'center' | 'right'
    ): PanelMenu.Button;
    menuManager: PopupMenu.PopupMenuManager;
  }
}

declare module 'resource:///org/gnome/shell/ui/main.js' {
  import * as Panel from 'resource:///org/gnome/shell/ui/panel.js';
  import * as Layout from 'resource:///org/gnome/shell/ui/layout.js';
  import { WindowManager } from 'resource:///org/gnome/shell/ui/windowManager.js';

  const wm: WindowManager;
  const panel: Panel.Panel;
  const layoutManager: Layout.LayoutManager;
  function notify(msg: string, banner?: string): void;
  function setThemeStylesheet(file: string): void;
  function loadTheme(): void;
}
