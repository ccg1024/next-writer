/**
 * Each application instace will implements this interface
 */
interface IApp {
  /**
   * Create a browser window, this method whill assign the window instance to a private variable `win`
   */
  createWindow(): void;

  /**
   * Mount Application menu from a template
   */
  createMenu(): void;

  /**
   * Run every destroy method of application dependence
   */
  destroy(): void;
}

export default IApp;
