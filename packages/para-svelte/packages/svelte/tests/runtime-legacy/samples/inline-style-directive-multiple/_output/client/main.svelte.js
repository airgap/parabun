import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p></p>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let myColor = $.prop($$props, 'myColor', 12, "red");
	let width = $.prop($$props, 'width', 12, "65px");
	let absolute = $.prop($$props, 'absolute', 12, false);
	let bold = $.prop($$props, 'bold', 12, true);

	var $$exports = {
		get myColor() {
			return myColor();
		},

		set myColor($$value) {
			myColor($$value);
			$.flush();
		},

		get width() {
			return width();
		},

		set width($$value) {
			width($$value);
			$.flush();
		},

		get absolute() {
			return absolute();
		},

		set absolute($$value) {
			absolute($$value);
			$.flush();
		},

		get bold() {
			return bold();
		},

		set bold($$value) {
			bold($$value);
			$.flush();
		}
	};

	var p = root();
	let styles;

	$.template_effect(() => styles = $.set_style(p, '', styles, {
		color: myColor(),
		width: width(),
		position: absolute() ? "absolute" : null,
		'font-weight': bold() ? 700 : 100
	}));

	$.append($$anchor, p);

	return $.pop($$exports);
}