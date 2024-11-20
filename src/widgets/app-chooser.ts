/*
 * Original work Copyright (c) 2018 Marcus Heine
 * Modified work Copyright (c) 2024 Stepan Shilin
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 * This file was modified from https://github.com/sakithb/media-controls
 */

import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import GObject from 'gi://GObject';

import { RESOURCE_PATH } from '../constants.js';

export class GDeejAppChooser extends Adw.Window {
  static {
    GObject.registerClass(
      {
        GTypeName: 'GDeejAppChooser',
        Template: `resource://${RESOURCE_PATH}ui/app-chooser.ui`,
        InternalChildren: ['list-box', 'btn-select', 'btn-cancel']
      },
      this
    );
  }

  private _listBox: Gtk.ListBox;
  private _btnCancel: Gtk.Button;
  private _btnSelect: Gtk.Button;

  constructor(params = {}) {
    super(params);

    // @ts-expect-error Typescript doesn't know about the internal children
    this._listBox = this._list_box;
    // @ts-expect-error Typescript doesn't know about the internal children
    this._btnSelect = this._btn_select;
    // @ts-expect-error Typescript doesn't know about the internal children
    this._btnCancel = this._btn_cancel;

    const apps = Gio.AppInfo.get_all();

    for (const app of apps) {
      if (app.should_show() === false) continue;

      const row = new Adw.ActionRow();
      row.title = app.get_display_name();
      row.subtitle = app.get_id() as string;
      row.subtitleLines = 1;

      const icon = new Gtk.Image({ gicon: app.get_icon() as Gio.Icon });
      row.add_prefix(icon);

      this._listBox.append(row);
    }

    this._btnCancel.connect('clicked', () => {
      this.close();
    });
  }

  public showChooser() {
    return new Promise<string>((resolve) => {
      const signalId = this._btnSelect.connect('clicked', () => {
        this.close();
        this._btnSelect.disconnect(signalId);

        const row = this._listBox.get_selected_row() as Adw.ActionRow;
        resolve(row.title);
      });

      this.present();
    });
  }
}
