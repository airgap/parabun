import * as $ from 'svelte/internal/server';

export default function Folder($$renderer, $$props) {
	let dir = $$props['dir'];
	let open = $.fallback($$props['open'], true);

	function get_items() {
		return dir === 'a'
			? [{ filename: 'a/b', isDir: true }]
			: [{ filename: 'a/b/c', isDir: false }];
	}

	$$renderer.push(`<li><span>${$.escape(dir)}</span> `);

	if (open) {
		$$renderer.push('<!--[0-->');
		$$renderer.push(`<ul><!--[-->`);

		const each_array = $.ensure_array_like(get_items());

		for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
			let item = each_array[$$index];

			if (item.isDir) {
				$$renderer.push('<!--[0-->');
				Folder($$renderer, { dir: item.filename });
				$$renderer.push(`<!---->`);
			} else {
				$$renderer.push('<!--[-1-->');
				$$renderer.push(`<li>${$.escape(item.filename)}</li>`);
			}

			$$renderer.push(`<!--]-->`);
		}

		$$renderer.push(`<!--]--></ul>`);
	} else {
		$$renderer.push('<!--[-1-->');
	}

	$$renderer.push(`<!--]--></li>`);
	$.bind_props($$props, { dir, open });
}