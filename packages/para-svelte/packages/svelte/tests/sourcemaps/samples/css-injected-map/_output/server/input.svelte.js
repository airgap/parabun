Input[$.FILENAME] = 'packages/svelte/tests/sourcemaps/samples/css-injected-map/input.svelte';

import * as $ from 'svelte/internal/server';

const $$css = {
	hash: 'svelte-16050j7',
	code: '\n	h1.svelte-16050j7 {\n		\n --done-replace-once: red;\n	}\n	h2.svelte-16050j7 {\n		\n\n  --done-replace-twice: green;\n	}\n	div.svelte-16050j7 {\n		--keep-me: blue;\n	}\n\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5wdXQuc3ZlbHRlLmNzcyIsInNvdXJjZXMiOlsiLi4vLi4vaW5wdXQuc3ZlbHRlIl0sInNvdXJjZXNDb250ZW50IjpbIjxoMT5UZXN0aW5nIFN0eWxlczwvaDE+XG48aDI+VGVzdGluZyBTdHlsZXMgMjwvaDI+XG48ZGl2PlRlc3RpbmcgU3R5bGVzIDM8L2Rpdj5cbjxzY3JpcHQ+ZXhwb3J0IGNvbnN0IGIgPSAyOzwvc2NyaXB0PlxuPHN0eWxlPlxuXHRoMSB7XG5cdFx0XG4gLS1kb25lLXJlcGxhY2Utb25jZTogcmVkO1xuXHR9XG5cdGgyIHtcblx0XHRcblxuICAtLWRvbmUtcmVwbGFjZS10d2ljZTogZ3JlZW47XG5cdH1cblx0ZGl2IHtcblx0XHQtLWtlZXAtbWU6IGJsdWU7XG5cdH1cbjwvc3R5bGU+XG4iXSwibmFtZXMiOlsiLS1yZXBsYWNlLW1lLW9uY2UiLCItLXJlcGxhY2UtbWUtdHdpY2UiXSwibWFwcGluZ3MiOiI7QUFLQSxDQUFDLGlCQUFFLENBQUM7QUFDSjtBQUFFQSx5QkFBc0I7QUFDeEI7QUFDQSxDQUFDLGlCQUFFLENBQUM7QUFDSjs7QUFBRUMsNkJBQXlCO0FBQzNCO0FBQ0EsQ0FBQyxrQkFBRyxDQUFDO0FBQ0wsRUFBRSxlQUFlO0FBQ2pCIiwiaWdub3JlTGlzdCI6W119 */'
};

function Input($$renderer, $$props) {
	$$renderer.global.css.add($$css);

	$$renderer.component(
		($$renderer) => {
			const b = 2;

			$$renderer.push(`<h1 class="svelte-16050j7">`);
			$.push_element($$renderer, 'h1', 1, 0);
			$$renderer.push(`Testing Styles</h1>`);
			$.pop_element();
			$$renderer.push(` <h2 class="svelte-16050j7">`);
			$.push_element($$renderer, 'h2', 2, 0);
			$$renderer.push(`Testing Styles 2</h2>`);
			$.pop_element();
			$$renderer.push(` <div class="svelte-16050j7">`);
			$.push_element($$renderer, 'div', 3, 0);
			$$renderer.push(`Testing Styles 3</div>`);
			$.pop_element();
			$.bind_props($$props, { b });
		},
		Input
	);
}

Input.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Input;