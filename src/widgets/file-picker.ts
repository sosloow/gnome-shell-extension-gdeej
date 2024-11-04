import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';
import GObject from 'gi://GObject';

import { gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

type FilePickerConstructorProps = {
  title: string;
};
export default class FilePickerRow extends Adw.EntryRow {
  _title?: string;

  constructor({ title }: FilePickerConstructorProps) {
    super({ title });
  }

  _init({ title }: FilePickerConstructorProps) {
    super._init({
      title
    });

    const fileButton = new Gtk.Button({
      // label: _('Choose device')
      iconName: 'document-open-symbolic',
      marginTop: 10,
      marginBottom: 10
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

    fileChooser.show();
  }
}
GObject.registerClass(FilePickerRow);
