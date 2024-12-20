import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';
import GObject from 'gi://GObject';

import { gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import { RESOURCE_PATH } from '../constants.js';

export class GDeejFilePickerRow extends Adw.EntryRow {
  static {
    GObject.registerClass(
      {
        GTypeName: 'GDeejFilePickerRow',
        Template: `resource://${RESOURCE_PATH}ui/file-picker-row.ui`,
        InternalChildren: ['file-button']
      },
      this
    );
  }

  fileButton: Gtk.Button;

  constructor(props = {}) {
    super(props);
    // @ts-expect-error Typescript doesn't know about the internal children
    this.fileButton = this._file_button;

    this.fileButton.connect('clicked', this._onFileButtonClicked.bind(this));
  }
  _onFileButtonClicked() {
    const root = this.get_root() as Gtk.Window;
    const fileChooser = new Gtk.FileChooserDialog({
      title: _('Select a serial device'),
      action: Gtk.FileChooserAction.OPEN,
      transient_for: root,
      modal: true
    });
    fileChooser.add_button(_('Cancel'), Gtk.ResponseType.CANCEL);
    fileChooser.add_button(_('Open'), Gtk.ResponseType.ACCEPT);
    fileChooser.show();

    fileChooser.connect('response', (dialog, response) => {
      if (response === Gtk.ResponseType.ACCEPT) {
        const file = fileChooser.get_file();
        const filePath = file!.get_path();
        if (filePath) {
          this.text = filePath;
        }
      }
      fileChooser.destroy();
    });
  }
}
