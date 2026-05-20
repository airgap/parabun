import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<div> </div>`);
var root_2 = $.from_html(`<span> </span>`);
var root_3 = $.from_html(`<li><p> </p></li>`);
var root_4 = $.from_html(`<li><hr/></li>`);
var root = $.from_html(`<!> <!> <ul></ul> <ul></ul>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let items = $.prop($$props, 'items', 28, () => ['foo', 'bar', 'baz']);
	let divs = $.prop($$props, 'divs', 28, () => []);
	let spans = $.prop($$props, 'spans', 28, () => ({}));
	let ps = $.prop($$props, 'ps', 28, () => []);
	let hrs = $.prop($$props, 'hrs', 28, () => ({}));
	const prefix = '-';

	var $$exports = {
		get items() {
			return items();
		},

		set items($$value) {
			items($$value);
			$.flush();
		},

		get divs() {
			return divs();
		},

		set divs($$value) {
			divs($$value);
			$.flush();
		},

		get spans() {
			return spans();
		},

		set spans($$value) {
			spans($$value);
			$.flush();
		},

		get ps() {
			return ps();
		},

		set ps($$value) {
			ps($$value);
			$.flush();
		},

		get hrs() {
			return hrs();
		},

		set hrs($$value) {
			hrs($$value);
			$.flush();
		}
	};

	$.init();

	var fragment = root();
	var node = $.first_child(fragment);

	$.each(node, 1, items, $.index, ($$anchor, item, j) => {
		var div = root_1();
		var text = $.child(div, true);

		$.reset(div);
		$.bind_this(div, ($$value, j) => divs(divs()[j] = $$value, true), (j) => divs()?.[j], () => [j]);
		$.template_effect(() => $.set_text(text, $.get(item)));
		$.append($$anchor, div);
	});

	var node_1 = $.sibling(node, 2);

	$.each(
		node_1,
		1,
		() => (
			$.deep_read_state(items()),
			$.untrack(() => Object.entries(items()))
		),
		$.index,
		($$anchor, $$item) => {
			var $$array = $.derived(() => $.to_array($.get($$item), 2));
			let key = () => $.get($$array)[0];
			let val = () => $.get($$array)[1];
			var span = root_2();
			var text_1 = $.child(span, true);

			$.reset(span);
			$.bind_this(span, ($$value, val, key) => spans(spans()[prefix + val + key] = $$value, true), (val, key) => spans()?.[prefix + val + key], () => [val(), key()]);
			$.template_effect(() => $.set_text(text_1, val()));
			$.append($$anchor, span);
		}
	);

	var ul = $.sibling(node_1, 2);

	$.each(ul, 7, items, (thing) => thing, ($$anchor, thing, j) => {
		var li = root_3();
		var p = $.child(li);
		var text_2 = $.child(p, true);

		$.reset(p);
		$.bind_this(p, ($$value, j) => ps(ps()[j] = $$value, true), (j) => ps()?.[j], () => [$.get(j)]);
		$.reset(li);
		$.template_effect(() => $.set_text(text_2, $.get(thing)));
		$.append($$anchor, li);
	});

	$.reset(ul);

	var ul_1 = $.sibling(ul, 2);

	$.each(ul_1, 7, items, (sure) => sure, ($$anchor, sure) => {
		var li_1 = root_4();
		var hr = $.child(li_1);

		$.bind_this(hr, ($$value, sure) => hrs(hrs()[sure] = $$value, true), (sure) => hrs()?.[sure], () => [$.get(sure)]);
		$.reset(li_1);
		$.append($$anchor, li_1);
	});

	$.reset(ul_1);
	$.append($$anchor, fragment);

	return $.pop($$exports);
}