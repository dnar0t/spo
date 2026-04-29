describe('Build smoke test', () => {
  it('should have all required modules', () => {
    // Проверяет что основные файлы проекта существуют
    const fs = require('fs');
    const path = require('path');
    const root = path.resolve(__dirname, '../../');

    expect(fs.existsSync(path.join(root, 'src/app.module.ts'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'src/main.ts'))).toBe(true);
  });
});
