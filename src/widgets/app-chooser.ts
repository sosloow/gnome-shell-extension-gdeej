import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';

class AppChooser extends Adw.Window {
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

export default AppChooser;
