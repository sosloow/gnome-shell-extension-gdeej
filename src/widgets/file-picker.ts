import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';
import GObject from 'gi://GObject';

import { gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

type FilePickerConstructorProps = {
  title: string;
  placeholder: string;
};
export default class FilePickerRow extends Adw.EntryRow {
  _placeholder?: string;
  _title?: string;

  constructor({ title, placeholder }: FilePickerConstructorProps) {
    super({ title });

    this._placeholder = placeholder;
  }

  _init({ title, placeholder }: FilePickerConstructorProps) {
    super._init({
      title
    });
    this._placeholder = placeholder;

    const fileButton = new Gtk.Button({
      label: _('Choose device')
    });
    fileButton.connect('clicked', this._onFileButtonClicked.bind(this));
    this.add_suffix(fileButton);
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

    fileChooser.show();
  }
}
GObject.registerClass(FilePickerRow);
