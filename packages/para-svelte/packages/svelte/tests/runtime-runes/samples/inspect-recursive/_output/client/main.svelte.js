import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';

var root_1 = $.add_locations($.from_html(`<li> </li>`), Main[$.FILENAME], [[33, 2]]);
var root = $.add_locations($.from_html(`<button>add</button> <ul></ul>`, 1), Main[$.FILENAME], [[28, 0], [31, 0]]);

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	class Rect {
		#x = $.tag($.state(), 'Rect.x');

		get x() {
			return $.get(this.#x);
		}

		set x(value) {
			$.set(this.#x, value, true);
		}

		#y = $.tag($.state(), 'Rect.y');

		get y() {
			return $.get(this.#y);
		}

		set y(value) {
			$.set(this.#y, value, true);
		}

		constructor(x, y) {
			this.x = x;
			this.y = y;
		}
	}

	class Node {
		#pos = $.tag($.state($.proxy({ x: 0, y: 0 })), 'Node.pos');

		get pos() {
			return $.get(this.#pos);
		}

		set pos(value) {
			$.set(this.#pos, value, true);
		}

		#rect = $.tag($.derived(() => new Rect(this.pos.x, this.pos.y)), 'Node.rect');

		get rect() {
			return $.get(this.#rect);
		}

		set rect(value) {
			$.set(this.#rect, value);
		}

		constructor(pos) {
			this.pos = pos;
		}
	}

	const nodes = $.tag_proxy($.proxy([]), 'nodes');
	const rects = $.tag($.derived(() => nodes.map((n) => n.rect)), 'rects');

	$.inspect(() => [$.get(rects)], (...$$args) => console.log(...$$args), true);

	var $$exports = { ...$.legacy_api() };
	var fragment = root();
	var button = $.first_child(fragment);
	var ul = $.sibling(button, 2);

	$.add_svelte_meta(
		() => $.each(ul, 21, () => $.get(rects), $.index, ($$anchor, rect) => {
			var li = root_1();
			var text = $.child(li);

			$.reset(li);
			$.template_effect(() => $.set_text(text, `${$.get(rect).x ?? ''} - ${$.get(rect).y ?? ''}`));
			$.append($$anchor, li);
		}),
		'each',
		Main,
		32,
		1
	);

	$.reset(ul);

	$.delegated('click', button, function click() {
		nodes.push(new Node({
			x: Math.floor(Math.random() * 100),
			y: Math.floor(Math.random() * 100)
		}));
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}

$.delegate(['click']);